// Spese in comune fra Pietro e Filippo, come in Splitwise: chi ha pagato, come si divide,
// saldo di chi deve a chi, rimborsi («Salda»), spese che si ripetono.
// Stanno nell'archivio del CT 203 (deploy/bollette.py, /api/spese), come le bollette:
// uguali su tutti i dispositivi; leggere e modificare può chiunque sia entrato in HA.
// Gli importi si calcolano in centesimi, così le due parti sommano sempre al totale.
// Nel mockup: alcune spese di esempio, solo in memoria.

import { hass } from './ha/hass.svelte';
import { api } from './api';
import { newId, iso } from './bollette.svelte';
import type { IconName } from './icons';

export type Persona = 'pietro' | 'filippo';
export const PERSONE: Persona[] = ['pietro', 'filippo'];
export const NOMI: Record<Persona, string> = { pietro: 'Pietro', filippo: 'Filippo' };
export const altro = (p: Persona): Persona => (p === 'pietro' ? 'filippo' : 'pietro');

/** Come si divide: in parti uguali, importi esatti, percentuali, quote, o tutto a carico dell'altro. */
export type Metodo = 'uguale' | 'esatto' | 'percentuale' | 'quote' | 'intero';
export const METODI: { m: Metodo; nome: string }[] = [
  { m: 'uguale', nome: 'A metà' },
  { m: 'esatto', nome: 'Importi' },
  { m: 'percentuale', nome: '%' },
  { m: 'quote', nome: 'Quote' },
  { m: 'intero', nome: 'Tutto' },
];

export type Ripeti = '' | 'settimana' | 'mese' | 'anno';
export const RIPETI: { r: Ripeti; nome: string }[] = [
  { r: '', nome: 'Mai' }, { r: 'settimana', nome: 'Ogni settimana' }, { r: 'mese', nome: 'Ogni mese' }, { r: 'anno', nome: 'Ogni anno' },
];

export type Categoria =
  | 'casa' | 'spesa' | 'ristoranti' | 'utenze' | 'trasporti' | 'viaggi' | 'svago' | 'acquisti' | 'salute' | 'animali' | 'altro';
export const CATEGORIE: Record<Categoria, { nome: string; icona: IconName }> = {
  casa: { nome: 'Casa e affitto', icona: 'casa' },
  spesa: { nome: 'Spesa', icona: 'carrello' },
  ristoranti: { nome: 'Ristoranti e bar', icona: 'ristorante' },
  utenze: { nome: 'Bollette e utenze', icona: 'bolletta' },
  trasporti: { nome: 'Auto e trasporti', icona: 'auto' },
  viaggi: { nome: 'Viaggi', icona: 'valigia' },
  svago: { nome: 'Svago', icona: 'biglietto' },
  acquisti: { nome: 'Acquisti', icona: 'borsa' },
  salute: { nome: 'Salute', icona: 'salute' },
  animali: { nome: 'Animali', icona: 'zampa' },
  altro: { nome: 'Altro', icona: 'etichetta' },
};
export const ORDINE_CAT = Object.keys(CATEGORIE) as Categoria[];

export interface Spesa {
  id: string;
  /** 'spesa' divisa fra i due; 'rimborso' = soldi dati da chi ha pagato all'altro. */
  tipo: 'spesa' | 'rimborso';
  descrizione: string;
  categoria: Categoria;
  /** Data AAAA-MM-GG. */
  data: string;
  /** Totale in euro. */
  importo: number;
  /** Chi ha pagato (per un rimborso: chi ha dato i soldi). */
  pagato: Persona;
  /** Quanto tocca a ciascuno, in euro; la somma è l'importo. Per un rimborso tutto a chi lo riceve. */
  parti: Record<Persona, number>;
  metodo: Metodo;
  /** I numeri scritti nel modulo (importi, percentuali o quote), per riaprirlo uguale. */
  valori: Record<Persona, number> | null;
  ripeti: Ripeti;
  note: string;
  modificata?: string;
  da?: string;
}

export const cent = (v: number) => Math.round(v * 100);

/** Divide un importo (in centesimi) secondo il metodo. Restituisce le parti in centesimi
 *  oppure un messaggio che dice cosa manca. Il centesimo dispari della metà va a chi ha pagato. */
export function dividi(c: number, pagato: Persona, metodo: Metodo, valori: Record<Persona, number>): Record<Persona, number> | string {
  const o = altro(pagato);
  if (metodo === 'uguale') {
    const meta = Math.floor(c / 2);
    return { [o]: meta, [pagato]: c - meta } as Record<Persona, number>;
  }
  if (metodo === 'intero') return { [o]: c, [pagato]: 0 } as Record<Persona, number>;
  const [a, b] = PERSONE;
  const va = valori[a], vb = valori[b];
  if (![va, vb].every((v) => Number.isFinite(v) && v >= 0)) return 'Scrivi un numero per ciascuno (anche 0).';
  if (metodo === 'esatto') {
    const diff = c - cent(va) - cent(vb);
    if (diff) return diff > 0 ? `Mancano ${fmtEuro(diff / 100)} da assegnare.` : `Hai assegnato ${fmtEuro(-diff / 100)} in più del totale.`;
    return { [a]: cent(va), [b]: cent(vb) } as Record<Persona, number>;
  }
  if (metodo === 'percentuale') {
    const tot = Math.round((va + vb) * 100) / 100;
    if (tot !== 100) return `Le percentuali fanno ${new Intl.NumberFormat('it-IT').format(tot)}%: devono fare 100%.`;
    const pa = Math.round((c * va) / 100);
    return { [a]: pa, [b]: c - pa } as Record<Persona, number>;
  }
  // quote: es. 2 e 1 → due terzi e un terzo
  if (va + vb <= 0) return 'Almeno una delle quote deve essere più di 0.';
  const pa = Math.round((c * va) / (va + vb));
  return { [a]: pa, [b]: c - pa } as Record<Persona, number>;
}

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const fmtEuro = (v: number) => eur.format(v);

/** Saldo di ciascuno, in centesimi: quanto ha pagato meno quanto gli tocca.
 *  Positivo = deve ricevere, negativo = deve dare; i due saldi sono opposti. */
export function saldo(list: Spesa[]): Record<Persona, number> {
  const s: Record<Persona, number> = { pietro: 0, filippo: 0 };
  for (const x of list) {
    s[x.pagato] += cent(x.importo);
    for (const p of PERSONE) s[p] -= cent(x.parti[p] ?? 0);
  }
  return s;
}

/** Effetto di una voce su una persona, in centesimi: positivo = ha prestato, negativo = deve. */
export const effetto = (x: Spesa, p: Persona) => (x.pagato === p ? cent(x.importo) : 0) - cent(x.parti[p] ?? 0);

/** Utente di HA → persona, dal nome (Pietro, Filippo); il pannello a muro non è nessuno dei due. */
export function personaDi(user: string): Persona | null {
  const u = user.toLowerCase();
  return PERSONE.find((p) => u.includes(p)) ?? null;
}

/** Riga del file CSV, come l'esportazione di Splitwise: data, descrizione, categoria, costo,
 *  valuta e il netto di ciascuno (positivo = ha prestato). */
export function csv(list: Spesa[]): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const n = (c: number) => (c / 100).toFixed(2).replace('.', ',');
  const rows = [['Data', 'Descrizione', 'Categoria', 'Costo', 'Valuta', NOMI.pietro, NOMI.filippo, 'Note'].map(q).join(';')];
  for (const x of [...list].sort((a, b) => a.data.localeCompare(b.data))) {
    rows.push([
      q(x.data), q(x.tipo === 'rimborso' ? `${NOMI[x.pagato]} ha dato a ${NOMI[altro(x.pagato)]}` : x.descrizione),
      q(x.tipo === 'rimborso' ? 'Rimborso' : CATEGORIE[x.categoria].nome), n(cent(x.importo)), q('EUR'),
      n(effetto(x, 'pietro')), n(effetto(x, 'filippo')), q(x.note),
    ].join(';'));
  }
  const s = saldo(list);
  rows.push(['', q('Saldo totale'), '', '', q('EUR'), n(s.pietro), n(s.filippo), ''].join(';'));
  return '﻿' + rows.join('\r\n'); // BOM: così Excel legge bene le lettere accentate
}

const esempio = (): Spesa[] => {
  const out: Spesa[] = [];
  const d = (giorniFa: number) => iso(Date.now() - giorniFa * 86_400_000);
  const add = (descrizione: string, categoria: Categoria, giorniFa: number, importo: number, pagato: Persona, metodo: Metodo = 'uguale', valori: Record<Persona, number> | null = null, ripeti: Ripeti = '') => {
    const parti = dividi(cent(importo), pagato, metodo, valori ?? { pietro: 0, filippo: 0 }) as Record<Persona, number>;
    out.push({
      id: newId(), tipo: 'spesa', descrizione, categoria, data: d(giorniFa), importo, pagato,
      parti: { pietro: parti.pietro / 100, filippo: parti.filippo / 100 }, metodo, valori, ripeti, note: '',
    });
  };
  add('Affitto', 'casa', 52, 900, 'pietro');
  add('Spesa Esselunga', 'spesa', 45, 86.4, 'filippo');
  add('Pizza da Gino', 'ristoranti', 38, 42, 'pietro');
  add('Internet Fastweb', 'utenze', 33, 29.95, 'filippo', 'uguale', null, 'mese');
  add('Benzina', 'trasporti', 30, 60, 'pietro', 'quote', { pietro: 2, filippo: 1 });
  add('Spesa Lidl', 'spesa', 26, 54.2, 'pietro');
  add('Affitto', 'casa', 22, 900, 'pietro', 'uguale', null, 'mese');
  add('Cinema', 'svago', 18, 19, 'filippo', 'intero');
  out.push({
    id: newId(), tipo: 'rimborso', descrizione: '', categoria: 'altro', data: d(15), importo: 400, pagato: 'filippo',
    parti: { pietro: 400, filippo: 0 }, metodo: 'intero', valori: null, ripeti: '', note: 'bonifico',
  });
  add('Crocchette', 'animali', 12, 38.5, 'filippo');
  add('Lampadine', 'acquisti', 8, 23.9, 'pietro', 'esatto', { pietro: 13.9, filippo: 10 });
  add('Spesa Coop', 'spesa', 3, 71.35, 'filippo');
  add('Aperitivo', 'ristoranti', 1, 16, 'pietro');
  // La prima «Affitto» ha già lasciato il posto alla seconda come spesa che si ripete.
  return out;
};

class Spese {
  list = $state<Spesa[]>([]);
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  error = $state('');

  private call(method: string, path: string, body?: unknown): Promise<any> {
    return api(method, `spese${path}`, body);
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
        this.list = d.spese ?? [];
      }
      this.status = 'ready';
    } catch (e: any) {
      this.error = e?.message ?? String(e);
      this.status = 'error';
    }
  }

  async save(x: Spesa) {
    const { modificata, da, ...dati } = x;
    if (hass.demo) {
      this.list = [...this.list.filter((y) => y.id !== x.id), { ...x, modificata: new Date().toISOString() }];
      return;
    }
    // Il servizio risponde con l'elenco intero: salvando una spesa che si ripete
    // può aggiungere subito le ripetizioni arretrate.
    const d = await this.call('PUT', `/${x.id}`, dati);
    this.list = d.spese ?? this.list;
  }

  async remove(id: string) {
    if (!hass.demo) await this.call('DELETE', `/${id}`);
    this.list = this.list.filter((x) => x.id !== id);
  }

  /** Ricarica in silenzio (pagina tornata in primo piano): le spese le cambia anche l'altro. */
  async refresh() {
    if (hass.demo || this.status !== 'ready') return;
    try { this.list = (await this.call('GET', '')).spese ?? this.list; } catch {}
  }
}

export const spese = new Spese();
