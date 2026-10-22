// Bollette di luce, gas, acqua e TARI, inserite a mano.
// Stanno nell'archivio del CT 203 (deploy/bollette.py, /api/bollette): uguali su tutti i dispositivi,
// conservate per anni. Leggere e modificare può chiunque sia entrato in HA (scelta di Pietro, 22/10).
// Nel mockup: alcune bollette di esempio, solo in memoria.

import { hass } from './ha/hass.svelte';
import { api } from './api';
import type { IconName } from './icons';

export type Tipo = 'luce' | 'gas' | 'acqua' | 'tari';

export interface Bolletta {
  id: string;
  tipo: Tipo;
  fornitore: string;
  /** Periodo di consumo (o di competenza per la TARI), date AAAA-MM-GG, estremi compresi. */
  dal: string;
  al: string;
  /** kWh, Smc o m³; null per la TARI o se non indicato. */
  consumo: number | null;
  /** Totale da pagare, in euro. */
  importo: number;
  scadenza: string | null;
  pagata: boolean;
  note: string;
  modificata?: string;
  da?: string;
}

export const TIPI: Record<Tipo, { nome: string; unita: string; icona: IconName; colore: string }> = {
  luce: { nome: 'Luce', unita: 'kWh', icona: 'energia', colore: 'var(--luci)' },
  gas: { nome: 'Gas', unita: 'Smc', icona: 'fiamma', colore: 'var(--caldo)' },
  acqua: { nome: 'Acqua', unita: 'm³', icona: 'goccia', colore: 'var(--energia)' },
  tari: { nome: 'TARI', unita: '', icona: 'rifiuti', colore: 'var(--clima)' },
};
export const ORDINE: Tipo[] = ['luce', 'gas', 'acqua', 'tari'];

/** Id casuale: crypto.randomUUID esiste solo in https, la dashboard è in http. */
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const DAY = 86_400_000;
const parse = (d: string) => {
  const [y, m, g] = d.split('-').map(Number);
  return new Date(y, m - 1, g).getTime();
};
export const iso = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Giorni del periodo, estremi compresi. */
export const giorni = (b: Pick<Bolletta, 'dal' | 'al'>) => Math.round((parse(b.al) - parse(b.dal)) / DAY) + 1;
/** Costo per unità (€/kWh, €/Smc, €/m³), se c'è il consumo. */
export const costoUnitario = (b: Bolletta) => (b.consumo && b.consumo > 0 ? b.importo / b.consumo : NaN);

/** Chiave del mese, «AAAA-MM». */
export const meseDi = (t: number) => iso(t).slice(0, 7);

/** Importo e consumo spalmati sui mesi in proporzione ai giorni: una bolletta bimestrale
 *  pesa metà su ciascun mese. Restituisce per ogni mese { euro, consumo }. */
export function perMese(list: Bolletta[]): Map<string, { euro: number; consumo: number }> {
  const out = new Map<string, { euro: number; consumo: number }>();
  for (const b of list) {
    const n = giorni(b);
    if (n <= 0) continue;
    const e = b.importo / n;
    const c = (b.consumo ?? 0) / n;
    for (let t = parse(b.dal), end = parse(b.al); t <= end; t = new Date(t).setDate(new Date(t).getDate() + 1)) {
      const k = meseDi(t);
      const m = out.get(k) ?? { euro: 0, consumo: 0 };
      m.euro += e;
      m.consumo += c;
      out.set(k, m);
    }
  }
  return out;
}

/** Somma dei mesi fra due chiavi «AAAA-MM» comprese. */
export function somma(mesi: Map<string, { euro: number; consumo: number }>, da: string, a: string) {
  let euro = 0, consumo = 0, coperti = 0;
  for (const [k, v] of mesi) if (k >= da && k <= a) { euro += v.euro; consumo += v.consumo; coperti++; }
  return { euro, consumo, coperti };
}

/** Chiave del mese spostato di n mesi (n negativo = indietro). */
export function sposta(mese: string, n: number): string {
  const [y, m] = mese.split('-').map(Number);
  return meseDi(new Date(y, m - 1 + n, 1).getTime());
}

/** La stessa bolletta: stesso tipo, stesso periodo, stesso importo al centesimo. */
export const chiave = (b: Pick<Bolletta, 'tipo' | 'dal' | 'al' | 'importo'>) => `${b.tipo}|${b.dal}|${b.al}|${Math.round(b.importo * 100)}`;

export interface DaImportare { b: Bolletta; stato: 'nuova' | 'presente' | 'errata'; motivo: string }

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
function errore(x: any): string {
  if (!x || typeof x !== 'object') return 'non è una bolletta';
  if (!ORDINE.includes(x.tipo)) return 'tipo sconosciuto';
  if (!DATA.test(x.dal ?? '') || !DATA.test(x.al ?? '')) return 'manca il periodo';
  if (x.al < x.dal) return "la fine viene prima dell'inizio";
  if (!numero(x.importo)) return "manca l'importo";
  if (x.consumo != null && !numero(x.consumo)) return 'consumo non valido';
  if (x.scadenza && !DATA.test(x.scadenza)) return 'scadenza non valida';
  return '';
}

/** Legge un file di bollette: lo stesso formato dell'archivio ({ bollette: [...] }) o solo l'elenco.
 *  Per ognuna dice se è nuova, già presente (nell'archivio o prima nel file) o non valida.
 *  Gli id del file non contano: ogni bolletta nuova ne riceve uno. */
export function leggiImport(testo: string, presenti: Bolletta[]): DaImportare[] {
  let dati: any;
  try { dati = JSON.parse(testo); } catch { throw new Error('il file non è un elenco di bollette (serve un file .json)'); }
  const elenco = Array.isArray(dati) ? dati : dati?.bollette;
  if (!Array.isArray(elenco)) throw new Error('nel file non c\'è un elenco di bollette');
  const viste = new Set(presenti.map(chiave));
  return elenco.map((x: any) => {
    const motivo = errore(x);
    const b: Bolletta = motivo ? x : {
      id: newId(), tipo: x.tipo, fornitore: String(x.fornitore ?? '').trim().slice(0, 80), dal: x.dal, al: x.al,
      consumo: x.tipo === 'tari' ? null : x.consumo ?? null, importo: x.importo, scadenza: x.scadenza || null,
      pagata: !!x.pagata, note: String(x.note ?? '').trim().slice(0, 500),
    };
    if (motivo) return { b, stato: 'errata', motivo };
    if (viste.has(chiave(b))) return { b, stato: 'presente', motivo: 'già presente' };
    viste.add(chiave(b));
    return { b, stato: 'nuova', motivo: '' };
  });
}

const esempio = (): Bolletta[] => {
  const out: Bolletta[] = [];
  const y = new Date().getFullYear();
  const add = (tipo: Tipo, fornitore: string, dal: string, al: string, consumo: number | null, importo: number, scadenza: string, pagata = true) =>
    out.push({ id: newId(), tipo, fornitore, dal, al, consumo, importo, scadenza, pagata, note: '' });
  for (const yy of [y - 1, y]) {
    for (let m = 0; m < 12; m += 2) {
      const dal = iso(new Date(yy, m, 1).getTime()), al = iso(new Date(yy, m + 2, 0).getTime());
      if (parse(al) > Date.now()) break;
      const inverno = m <= 2 || m >= 10;
      add('luce', 'Enel Energia', dal, al, 520 + (inverno ? 90 : 0) + m * 3, 148 + (inverno ? 22 : 0) + m, iso(new Date(yy, m + 2, 20).getTime()));
      add('gas', 'Enel Energia', dal, al, inverno ? 260 : 45, inverno ? 290 : 62, iso(new Date(yy, m + 2, 20).getTime()));
    }
    for (let m = 0; m < 12; m += 3) {
      const dal = iso(new Date(yy, m, 1).getTime()), al = iso(new Date(yy, m + 3, 0).getTime());
      if (parse(al) > Date.now()) break;
      add('acqua', 'Acquedotto', dal, al, 28 + m, 61 + m * 1.5, iso(new Date(yy, m + 4, 10).getTime()));
    }
    add('tari', 'Comune', `${yy}-01-01`, `${yy}-12-31`, null, 286, `${yy}-07-31`, yy < y);
  }
  // Ultima bolletta della luce ancora da pagare, per vedere le scadenze.
  const last = out.filter((b) => b.tipo === 'luce').at(-1);
  if (last) { last.pagata = false; last.scadenza = iso(Date.now() + 9 * DAY); }
  return out;
};

class Archivio {
  list = $state<Bolletta[]>([]);
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  error = $state('');

  private call(method: string, path: string, body?: unknown): Promise<any> {
    return api(method, `bollette${path}`, body);
  }

  async load() {
    if (this.status === 'loading') return;
    this.status = 'loading';
    this.error = '';
    try {
      if (hass.demo) {
        if (!this.list.length) this.list = esempio();
      } else {
        const d = await this.call('GET', '');
        this.list = d.bollette ?? [];
      }
      this.status = 'ready';
    } catch (e: any) {
      this.error = e?.message ?? String(e);
      this.status = 'error';
    }
  }

  async save(b: Bolletta) {
    const { modificata, da, ...dati } = b;
    const saved: Bolletta = hass.demo ? { ...b, modificata: new Date().toISOString() } : await this.call('PUT', `/${b.id}`, dati);
    this.list = [...this.list.filter((x) => x.id !== b.id), saved];
  }

  async remove(id: string) {
    if (!hass.demo) await this.call('DELETE', `/${id}`);
    this.list = this.list.filter((x) => x.id !== id);
  }
}

export const bollette = new Archivio();
