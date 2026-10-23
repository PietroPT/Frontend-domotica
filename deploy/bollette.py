#!/usr/bin/env python3
"""Archivio delle bollette per la HA-Dashboard, nel CT 203 accanto a nginx.

Un file JSON in /var/lib/ha-dashboard/bollette.json; a ogni modifica la versione precedente
resta in /var/lib/ha-dashboard/storico/ (le ultime 100).

Accesso: ogni richiesta porta il token di Home Assistant con cui la dashboard è entrata.
Il servizio chiede a HA chi è (WebSocket, auth/current_user): leggere e modificare può
chiunque abbia un accesso valido a HA (scelta di Pietro, 22/10); ogni bolletta ricorda chi
l'ha modificata per ultimo e lo storico conserva le versioni precedenti. Nessuna password qui.

Dal 22/10 tiene anche la disposizione della Casa (/api/casa, file casa.json): quali riquadri
e in che ordine, uguale per tutti gli utenti e i dispositivi (scelta di Pietro). Stesso controllo
dell'accesso: chi entra in HA la legge e la cambia.

Dal 23/10 tiene anche le spese in comune fra Pietro e Filippo, come Splitwise (/api/spese, file
spese.json, storico come le bollette). Le spese che si ripetono le aggiunge il servizio stesso,
quando arriva la data, a ogni lettura: così non le crea due volte un secondo dispositivo.

Ascolta solo su 127.0.0.1: da fuori ci si arriva attraverso nginx (/api/bollette, /api/casa, /api/spese).
Avviato da systemd (deploy/ha-bollette.service), con utente proprio e senza privilegi.
"""

import calendar
import hashlib
import json
import os
import re
import sys
import tempfile
import threading
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from websockets.sync.client import connect

HA_WS = os.environ.get("HA_WS", "ws://10.10.50.10:8123/api/websocket")
DATA_DIR = os.environ.get("DATA_DIR", "/var/lib/ha-dashboard")
PORT = int(os.environ.get("PORT", "8099"))
FILE = os.path.join(DATA_DIR, "bollette.json")
CASA = os.path.join(DATA_DIR, "casa.json")
SPESE = os.path.join(DATA_DIR, "spese.json")
HISTORY = os.path.join(DATA_DIR, "storico")
KEEP = 100
MAX_BODY = 16 * 1024

TIPI = {"luce", "gas", "acqua", "tari"}
lock = threading.Lock()

# --- Chi è: si chiede a HA e si ricorda per 5 minuti (per token, mai salvato su disco) ---
_users: dict[str, tuple[float, dict | None]] = {}


def who(token: str) -> dict | None:
    key = hashlib.sha256(token.encode()).hexdigest()
    hit = _users.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    user = None
    try:
        with connect(HA_WS, open_timeout=5, close_timeout=2) as ws:
            json.loads(ws.recv(timeout=5))  # auth_required
            ws.send(json.dumps({"type": "auth", "access_token": token}))
            if json.loads(ws.recv(timeout=5)).get("type") == "auth_ok":
                ws.send(json.dumps({"id": 1, "type": "auth/current_user"}))
                r = json.loads(ws.recv(timeout=5))
                if r.get("success"):
                    u = r["result"]
                    user = {"name": u.get("name") or ""}
    except Exception as e:  # HA spento o non raggiungibile: nessun accesso, e lo si dice nel registro
        print(f"controllo dell'accesso non riuscito: {e}", file=sys.stderr, flush=True)
        return None
    # Un rifiuto si ricorda poco, così un login appena fatto non resta bloccato.
    _users[key] = (time.time() + (300 if user else 10), user)
    return user


# --- Archivio ---
def load() -> dict:
    try:
        with open(FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"versione": 1, "bollette": []}


def write(path: str, data: dict) -> None:
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def save(data: dict, path: str = FILE, prefix: str = "bollette") -> None:
    os.makedirs(HISTORY, exist_ok=True)
    if os.path.exists(path):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        os.replace(path, os.path.join(HISTORY, f"{prefix}-{stamp}.json"))
        old = sorted(n for n in os.listdir(HISTORY) if n.startswith(prefix + "-"))
        for name in old[:-KEEP]:
            os.remove(os.path.join(HISTORY, name))
    write(path, data)


# --- Disposizione della Casa: un elenco di entità, nell'ordine dei riquadri ---
def casa_load() -> dict:
    try:
        with open(CASA, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"riquadri": None}


def casa_clean(b) -> list[str]:
    ids = b.get("riquadri") if isinstance(b, dict) else None
    if not isinstance(ids, list) or len(ids) > 500:
        raise ValueError("elenco dei riquadri non valido")
    out: list[str] = []
    for i in ids:
        if not isinstance(i, str) or len(i) > 255 or not re.fullmatch(r"[a-z_]+\.[a-z0-9_]+", i):
            raise ValueError("entità non valida")
        if i not in out:
            out.append(i)
    return out


# --- Spese in comune fra Pietro e Filippo (come Splitwise) ---
PERSONE = ("pietro", "filippo")
METODI = {"uguale", "esatto", "percentuale", "quote", "intero"}
CATEGORIE = {"casa", "spesa", "ristoranti", "utenze", "trasporti", "viaggi", "svago", "acquisti", "salute", "animali", "altro"}
RIPETI = {"", "settimana", "mese", "anno"}


def spese_load() -> dict:
    try:
        with open(SPESE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"versione": 1, "spese": []}


def spesa_clean(b: dict) -> dict:
    if not isinstance(b, dict):
        raise ValueError("spesa non valida")
    tipo = b.get("tipo")
    if tipo not in ("spesa", "rimborso"):
        raise ValueError("tipo non valido")
    pagato = b.get("pagato")
    if pagato not in PERSONE:
        raise ValueError("manca chi ha pagato")
    c = round(number(b.get("importo"), "importo", True, 1_000_000) * 100)
    if c <= 0:
        raise ValueError("l'importo deve essere più di zero")
    altro = PERSONE[1] if pagato == PERSONE[0] else PERSONE[0]
    if tipo == "rimborso":
        # Chi dà i soldi «paga» e la parte è tutta di chi li riceve: così il saldo si muove da sé.
        parti = {altro: c / 100, pagato: 0.0}
        metodo, valori, categoria, ripeti = "intero", None, "altro", ""
        descrizione = text(b.get("descrizione"), "descrizione", 100)
    else:
        p = b.get("parti")
        if not isinstance(p, dict):
            raise ValueError("manca la divisione")
        pc = {k: round(number(p.get(k), "parte", True, 1_000_000) * 100) for k in PERSONE}
        if sum(pc.values()) != c:
            raise ValueError("le parti non sommano al totale")
        parti = {k: v / 100 for k, v in pc.items()}
        metodo = b.get("metodo")
        if metodo not in METODI:
            raise ValueError("divisione non valida")
        v = b.get("valori")
        valori = {k: number(v.get(k), "valori", True, 1_000_000) for k in PERSONE} if isinstance(v, dict) else None
        categoria = b.get("categoria")
        if categoria not in CATEGORIE:
            raise ValueError("categoria non valida")
        ripeti = b.get("ripeti") or ""
        if ripeti not in RIPETI:
            raise ValueError("ripetizione non valida")
        descrizione = text(b.get("descrizione"), "descrizione", 100)
        if not descrizione:
            raise ValueError("manca la descrizione")
    return {
        "tipo": tipo,
        "descrizione": descrizione,
        "categoria": categoria,
        "data": day(b.get("data"), "data", True),
        "importo": c / 100,
        "pagato": pagato,
        "parti": parti,
        "metodo": metodo,
        "valori": valori,
        "ripeti": ripeti,
        "note": text(b.get("note"), "note", 500),
    }


def dopo(d: date, ripeti: str, giorno: int) -> date:
    """Data della ripetizione successiva. Per mesi e anni si torna al giorno della prima
    (il 31 diventa il 30 o il 28 nei mesi più corti, e il mese dopo torna 31)."""
    if ripeti == "settimana":
        return d + timedelta(days=7)
    y, m = divmod(d.month - 1 + (1 if ripeti == "mese" else 12), 12)
    y, m = d.year + y, m + 1
    return date(y, m, min(giorno, calendar.monthrange(y, m)[1]))


def ripetizioni(data: dict) -> bool:
    """Aggiunge le spese che si ripetono arrivate alla loro data. La ripetizione passa alla
    copia più recente, che è quella da modificare o fermare. Vero se ha aggiunto qualcosa."""
    oggi, now, added = date.today(), datetime.now(timezone.utc).isoformat(timespec="seconds"), False
    for s in list(data["spese"]):
        cur, n = s, 0
        while cur.get("ripeti") and n < 1000:
            primo = cur.get("primo") or cur["data"]
            nxt = dopo(date.fromisoformat(cur["data"]), cur["ripeti"], int(primo[8:10]))
            if nxt > oggi:
                break
            new = {**cur, "id": str(uuid.uuid4()), "data": nxt.isoformat(), "primo": primo,
                   "creata": now, "modificata": now, "da": "ripetizione automatica"}
            cur["ripeti"] = ""
            data["spese"].append(new)
            cur, n, added = new, n + 1, True
    return added


# --- Controllo di una bolletta ---
def day(v, field: str, required: bool) -> str | None:
    if v in (None, ""):
        if required:
            raise ValueError(f"manca {field}")
        return None
    if not isinstance(v, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        raise ValueError(f"{field}: data non valida")
    date.fromisoformat(v)
    return v


def number(v, field: str, required: bool, top: float) -> float | None:
    if v in (None, ""):
        if required:
            raise ValueError(f"manca {field}")
        return None
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not (0 <= v <= top):
        raise ValueError(f"{field}: numero non valido")
    return round(float(v), 4)


def text(v, field: str, top: int) -> str:
    if v is None:
        return ""
    if not isinstance(v, str) or len(v) > top:
        raise ValueError(f"{field}: testo troppo lungo")
    return v.strip()


def clean(b: dict) -> dict:
    if not isinstance(b, dict):
        raise ValueError("bolletta non valida")
    tipo = b.get("tipo")
    if tipo not in TIPI:
        raise ValueError("tipo non valido")
    dal, al = day(b.get("dal"), "inizio del periodo", True), day(b.get("al"), "fine del periodo", True)
    if al < dal:
        raise ValueError("la fine del periodo viene prima dell'inizio")
    return {
        "tipo": tipo,
        "fornitore": text(b.get("fornitore"), "fornitore", 80),
        "dal": dal,
        "al": al,
        "consumo": None if tipo == "tari" else number(b.get("consumo"), "consumo", False, 1_000_000),
        "importo": number(b.get("importo"), "importo", True, 100_000),
        "scadenza": day(b.get("scadenza"), "scadenza", False),
        "pagata": bool(b.get("pagata")),
        "note": text(b.get("note"), "note", 500),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "bollette"
    sys_version = ""

    def log_message(self, fmt, *args):  # niente indirizzi né token nel registro: solo metodo, percorso ed esito
        pass

    def reply(self, code: int, body: dict) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)
        print(f"{self.command} {self.path.split('?')[0]} {code}", file=sys.stderr, flush=True)

    def user(self) -> dict | None:
        m = re.fullmatch(r"Bearer ([\w.\-]+)", self.headers.get("Authorization", ""))
        u = who(m.group(1)) if m else None
        if not u:
            self.reply(401, {"errore": "Accesso a Home Assistant non valido: entra di nuovo nella dashboard."})
            return None
        return u

    def target(self) -> str | None:
        m = re.fullmatch(r"/api/bollette(?:/([0-9a-f-]{36}))?", self.path.split("?")[0])
        if not m:
            self.reply(404, {"errore": "indirizzo sconosciuto"})
            return None
        return m.group(1) or ""

    def body(self):
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            self.reply(413, {"errore": "dati mancanti o troppo grandi"})
            return None
        try:
            return json.loads(self.rfile.read(size))
        except json.JSONDecodeError as e:
            self.reply(400, {"errore": str(e)})
            return None

    def casa(self) -> bool:
        return self.path.split("?")[0] == "/api/casa"

    def spese(self) -> str | None:
        """None se l'indirizzo non è delle spese, "" per l'elenco, altrimenti l'id."""
        m = re.fullmatch(r"/api/spese(?:/([0-9a-f-]{36}))?", self.path.split("?")[0])
        return None if not m else m.group(1) or ""

    def spese_get(self, sid: str):
        if sid:
            return self.reply(405, {"errore": "si legge solo l'elenco completo"})
        if self.user():
            with lock:
                data = spese_load()
                if ripetizioni(data):
                    save(data, SPESE, "spese")
                self.reply(200, data)

    def spese_put(self, sid: str):
        if not sid:
            return self.reply(405, {"errore": "serve l'id della spesa"})
        u = self.user()
        raw = self.body() if u else None
        if raw is None:
            return
        try:
            s = spesa_clean(raw)
        except ValueError as e:
            return self.reply(400, {"errore": str(e)})
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with lock:
            data = spese_load()
            old = next((x for x in data["spese"] if x["id"] == sid), None)
            # «primo» tiene il giorno del mese di una serie che si ripete; se cambia la data si riparte da lì.
            primo = old.get("primo") if old and old.get("data") == s["data"] and s["ripeti"] else None
            s = {"id": sid, **s, **({"primo": primo} if primo else {}),
                 "creata": (old or {}).get("creata") or now, "modificata": now, "da": u["name"]}
            data["spese"] = [x for x in data["spese"] if x["id"] != sid] + [s]
            ripetizioni(data)
            save(data, SPESE, "spese")
            # Tutto l'elenco: il salvataggio può aver aggiunto ripetizioni arretrate.
            self.reply(200, data)

    def spese_delete(self, sid: str):
        if not sid:
            return self.reply(405, {"errore": "serve l'id della spesa"})
        if not self.user():
            return
        with lock:
            data = spese_load()
            n = len(data["spese"])
            data["spese"] = [x for x in data["spese"] if x["id"] != sid]
            if len(data["spese"]) == n:
                return self.reply(404, {"errore": "spesa non trovata"})
            save(data, SPESE, "spese")
        self.reply(200, {"cancellata": sid})

    def do_GET(self):
        if (sid := self.spese()) is not None:
            return self.spese_get(sid)
        if self.casa():
            if self.user():
                with lock:
                    self.reply(200, casa_load())
            return
        t = self.target()
        if t is None:
            return
        if t:
            return self.reply(405, {"errore": "si legge solo l'elenco completo"})
        if self.user():
            with lock:
                self.reply(200, load())

    def do_PUT(self):
        if (sid := self.spese()) is not None:
            return self.spese_put(sid)
        if self.casa():
            u = self.user()
            raw = self.body() if u else None
            if raw is None:
                return
            try:
                ids = casa_clean(raw)
            except ValueError as e:
                return self.reply(400, {"errore": str(e)})
            data = {"riquadri": ids, "modificata": datetime.now(timezone.utc).isoformat(timespec="seconds"), "da": u["name"]}
            with lock:
                write(CASA, data)
            return self.reply(200, data)
        bid = self.target()
        if not bid:
            if bid == "":
                self.reply(405, {"errore": "serve l'id della bolletta"})
            return
        u = self.user()
        if not u:
            return
        raw = self.body()
        if raw is None:
            return
        try:
            b = clean(raw)
        except ValueError as e:
            return self.reply(400, {"errore": str(e)})
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with lock:
            data = load()
            old = next((x for x in data["bollette"] if x["id"] == bid), None)
            b = {"id": bid, **b, "creata": old["creata"] if old else now, "modificata": now, "da": u["name"]}
            data["bollette"] = [x for x in data["bollette"] if x["id"] != bid] + [b]
            save(data)
        self.reply(200, b)

    def do_DELETE(self):
        if (sid := self.spese()) is not None:
            return self.spese_delete(sid)
        bid = self.target()
        if not bid:
            if bid == "":
                self.reply(405, {"errore": "serve l'id della bolletta"})
            return
        if not self.user():
            return
        with lock:
            data = load()
            n = len(data["bollette"])
            data["bollette"] = [x for x in data["bollette"] if x["id"] != bid]
            if len(data["bollette"]) == n:
                return self.reply(404, {"errore": "bolletta non trovata"})
            save(data)
        self.reply(200, {"cancellata": bid})


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"bollette: ascolto su 127.0.0.1:{PORT}, dati in {FILE}, HA {HA_WS}", file=sys.stderr, flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
