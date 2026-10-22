#!/usr/bin/env python3
"""Archivio delle bollette per la HA-Dashboard, nel CT 203 accanto a nginx.

Un file JSON in /var/lib/ha-dashboard/bollette.json; a ogni modifica la versione precedente
resta in /var/lib/ha-dashboard/storico/ (le ultime 100).

Accesso: ogni richiesta porta il token di Home Assistant con cui la dashboard è entrata.
Il servizio chiede a HA chi è (WebSocket, auth/current_user): leggere può chiunque abbia
un accesso valido a HA; modificare solo un amministratore. Nessuna password qui.

Ascolta solo su 127.0.0.1: da fuori ci si arriva attraverso nginx (/api/bollette).
Avviato da systemd (deploy/ha-bollette.service), con utente proprio e senza privilegi.
"""

import hashlib
import json
import os
import re
import sys
import tempfile
import threading
import time
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from websockets.sync.client import connect

HA_WS = os.environ.get("HA_WS", "ws://10.10.50.10:8123/api/websocket")
DATA_DIR = os.environ.get("DATA_DIR", "/var/lib/ha-dashboard")
PORT = int(os.environ.get("PORT", "8099"))
FILE = os.path.join(DATA_DIR, "bollette.json")
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
                    user = {"name": u.get("name") or "", "admin": bool(u.get("is_admin"))}
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


def save(data: dict) -> None:
    os.makedirs(HISTORY, exist_ok=True)
    if os.path.exists(FILE):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        os.replace(FILE, os.path.join(HISTORY, f"bollette-{stamp}.json"))
        old = sorted(os.listdir(HISTORY))
        for name in old[:-KEEP]:
            os.remove(os.path.join(HISTORY, name))
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, FILE)


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

    def user(self, admin: bool) -> dict | None:
        m = re.fullmatch(r"Bearer ([\w.\-]+)", self.headers.get("Authorization", ""))
        u = who(m.group(1)) if m else None
        if not u:
            self.reply(401, {"errore": "Accesso a Home Assistant non valido: entra di nuovo nella dashboard."})
            return None
        if admin and not u["admin"]:
            self.reply(403, {"errore": "Solo un amministratore di Home Assistant può modificare le bollette."})
            return None
        return u

    def target(self) -> str | None:
        m = re.fullmatch(r"/api/bollette(?:/([0-9a-f-]{36}))?", self.path.split("?")[0])
        if not m:
            self.reply(404, {"errore": "indirizzo sconosciuto"})
            return None
        return m.group(1) or ""

    def do_GET(self):
        t = self.target()
        if t is None:
            return
        if t:
            return self.reply(405, {"errore": "si legge solo l'elenco completo"})
        u = self.user(admin=False)
        if u:
            with lock:
                self.reply(200, {**load(), "admin": u["admin"]})

    def do_PUT(self):
        bid = self.target()
        if not bid:
            if bid == "":
                self.reply(405, {"errore": "serve l'id della bolletta"})
            return
        u = self.user(admin=True)
        if not u:
            return
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self.reply(413, {"errore": "dati mancanti o troppo grandi"})
        try:
            b = clean(json.loads(self.rfile.read(size)))
        except (ValueError, json.JSONDecodeError) as e:
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
        bid = self.target()
        if not bid:
            if bid == "":
                self.reply(405, {"errore": "serve l'id della bolletta"})
            return
        if not self.user(admin=True):
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
