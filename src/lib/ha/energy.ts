// Energia consumata oggi, presa per presa e ora per ora.
// Dal vivo: statistiche a 5 minuti di HA (recorder/statistics_during_period, tipo «change»)
// dei contatori kWh delle prese, cioè gli stessi numeri del pannello Energia di HA.
// Nel mockup: integrazione della cronologia finta della potenza.

import { hass } from './hass.svelte';
import type { HistoryPoint } from './types';

export interface EnergyToday {
  /** kWh di oggi per sensore di potenza (chiave = entity_id del sensore di potenza). */
  byPower: Record<string, number>;
  /** kWh di oggi per ora, 0–23. */
  hourly: number[];
}

const midnight = () => new Date().setHours(0, 0, 0, 0);

/** Contatore kWh sullo stesso dispositivo del sensore di potenza. */
export const energyOf = (powerId: string) =>
  hass.sibling(powerId, (s) => s.attributes.device_class === 'energy' && s.attributes.state_class !== 'measurement');

export async function loadEnergyToday(powerIds: string[]): Promise<EnergyToday> {
  const byPower: Record<string, number> = {};
  const hourly = Array<number>(24).fill(0);

  if (hass.demo) {
    // Cronologia finta a passi di 5 minuti: W × 5 min → kWh.
    const m = midnight();
    for (const id of powerIds) {
      for (const p of hass.history(id)) {
        if (p.t < m) continue;
        const k = (p.v * 5) / 60 / 1000;
        byPower[id] = (byPower[id] ?? 0) + k;
        hourly[new Date(p.t).getHours()] += k;
      }
    }
    return { byPower, hourly };
  }

  const pairs = powerIds.map((p) => [p, energyOf(p)?.entity_id] as const).filter(([, e]) => !!e) as [string, string][];
  if (!pairs.length || !hass.ws) return { byPower, hourly };
  const res = (await hass.ws({
    type: 'recorder/statistics_during_period',
    start_time: new Date(midnight()).toISOString(),
    statistic_ids: pairs.map(([, e]) => e),
    period: '5minute',
    types: ['change'],
    units: { energy: 'kWh' },
  })) as Record<string, { start: number; change?: number | null }[]>;
  for (const [power, energy] of pairs) {
    for (const r of res[energy] ?? []) {
      const k = r.change ?? 0;
      byPower[power] = (byPower[power] ?? 0) + k;
      hourly[new Date(r.start).getHours()] += k;
    }
  }
  return { byPower, hourly };
}

export interface EnergyMonths {
  /** kWh del mese in corso fino all'ultima ora completa, per sensore di potenza. */
  thisMonth: Record<string, number>;
  /** kWh del mese scorso, per sensore di potenza. */
  lastMonth: Record<string, number>;
}

/** Primo giorno del mese, a mezzanotte: back = 0 questo mese, 1 il precedente. */
export const monthStart = (back = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - back, 1).getTime();
};

/** kWh di questo mese e del mese scorso: statistiche mensili di HA (tipo «change») dei contatori delle prese. */
export async function loadEnergyMonths(powerIds: string[]): Promise<EnergyMonths> {
  const thisMonth: Record<string, number> = {};
  const lastMonth: Record<string, number> = {};

  if (hass.demo) {
    // Mockup: i giorni passati come oggi, il mese scorso un po' meno.
    const today = (await loadEnergyToday(powerIds)).byPower;
    const days = new Date().getDate();
    for (const [id, k] of Object.entries(today)) {
      thisMonth[id] = k * days;
      lastMonth[id] = k * 30 * 0.92;
    }
    return { thisMonth, lastMonth };
  }

  const pairs = powerIds.map((p) => [p, energyOf(p)?.entity_id] as const).filter(([, e]) => !!e) as [string, string][];
  if (!pairs.length || !hass.ws) return { thisMonth, lastMonth };
  const res = (await hass.ws({
    type: 'recorder/statistics_during_period',
    start_time: new Date(monthStart(1)).toISOString(),
    statistic_ids: pairs.map(([, e]) => e),
    period: 'month',
    types: ['change'],
    units: { energy: 'kWh' },
  })) as Record<string, { start: number; change?: number | null }[]>;
  const cut = monthStart(0);
  for (const [power, energy] of pairs) {
    for (const r of res[energy] ?? []) {
      const into = r.start >= cut ? thisMonth : lastMonth;
      into[power] = (into[power] ?? 0) + (r.change ?? 0);
    }
  }
  return { thisMonth, lastMonth };
}

/** Andamento: ultimi 30 giorni, ultimi 12 mesi, oppure anno per anno. */
export type TrendRange = 'giorni' | 'mesi' | 'anni';
export interface TrendBucket {
  /** Inizio del giorno, del mese o dell'anno (ms). */
  t: number;
  /** kWh per sensore di potenza. */
  byPower: Record<string, number>;
}

function bucketStarts(range: TrendRange): number[] {
  const d = new Date();
  const [y, m, day] = [d.getFullYear(), d.getMonth(), d.getDate()];
  if (range === 'giorni') return Array.from({ length: 30 }, (_, i) => new Date(y, m, day - 29 + i).getTime());
  if (range === 'mesi') return Array.from({ length: 12 }, (_, i) => new Date(y, m - 11 + i, 1).getTime());
  return Array.from({ length: 10 }, (_, i) => new Date(y - 9 + i, 0, 1).getTime());
}

/** kWh per giorno, mese o anno dalle statistiche a lungo termine di HA, che HA non cancella:
 *  restano finché c'è il suo database (e nei backup della VM). HA dà giorni e mesi;
 *  gli anni sono la somma dei mesi. Negli anni si parte dal primo con dati (almeno gli ultimi 3). */
export async function loadEnergyTrend(powerIds: string[], range: TrendRange): Promise<TrendBucket[]> {
  const starts = bucketStarts(range);
  const buckets: TrendBucket[] = starts.map((t) => ({ t, byPower: {} }));
  // Mezzo periodo di margine: se il fuso del browser e quello di HA differiscono, l'inizio
  // di un giorno o di un mese restituito da HA cade comunque nel periodo giusto.
  const half = range === 'giorni' ? 12 * 3600_000 : 15 * 86_400_000;
  const add = (start: number, power: string, k: number) => {
    let i = starts.length - 1;
    while (i > 0 && starts[i] > start + half) i--;
    if (start + half < starts[0]) return;
    buckets[i].byPower[power] = (buckets[i].byPower[power] ?? 0) + k;
  };

  if (hass.demo) {
    // Mockup: i giorni come oggi, con un po' di variazione e più consumi d'inverno; due anni e mezzo di dati.
    const today = (await loadEnergyToday(powerIds)).byPower;
    const first = new Date(new Date().getFullYear() - 2, 0, 1).getTime();
    const season = (t: number) => 1 + 0.25 * Math.cos(((new Date(t).getMonth() + 0.5) / 12) * 2 * Math.PI);
    for (let t = first; t <= Date.now(); t += 86_400_000) {
      const wobble = 0.75 + ((Math.sin(t / 86_400_000) + 1) / 2) * 0.5;
      for (const [id, k] of Object.entries(today)) add(t, id, k * season(t) * wobble);
    }
  } else {
    const pairs = powerIds.map((p) => [p, energyOf(p)?.entity_id] as const).filter(([, e]) => !!e) as [string, string][];
    if (!pairs.length || !hass.ws) return range === 'anni' ? buckets.slice(-3) : buckets;
    const res = (await hass.ws({
      type: 'recorder/statistics_during_period',
      start_time: new Date(starts[0]).toISOString(),
      statistic_ids: pairs.map(([, e]) => e),
      period: range === 'giorni' ? 'day' : 'month',
      types: ['change'],
      units: { energy: 'kWh' },
    })) as Record<string, { start: number; change?: number | null }[]>;
    for (const [power, energy] of pairs) for (const r of res[energy] ?? []) add(r.start, power, r.change ?? 0);
  }

  if (range !== 'anni') return buckets;
  const firstWithData = buckets.findIndex((b) => Object.values(b.byPower).some((k) => k > 0));
  return buckets.slice(Math.min(firstWithData < 0 ? buckets.length : firstWithData, buckets.length - 3));
}

/** Prezzo dell'energia in €/kWh: un aiutante numerico di HA, uguale su tutti i dispositivi. */
export const PRICE_ID = 'input_number.costo_energia';

export function price(): number {
  const v = parseFloat(hass.states[PRICE_ID]?.state ?? '');
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

/** Salva il prezzo; la prima volta crea l'aiutante in HA (serve un amministratore). */
export async function setPrice(value: number): Promise<void> {
  if (hass.demo) {
    const stamp = new Date().toISOString();
    hass.states[PRICE_ID] = {
      entity_id: PRICE_ID, state: String(value), last_changed: stamp, last_updated: stamp,
      attributes: { friendly_name: 'Costo energia', unit_of_measurement: '€/kWh' },
    };
    return;
  }
  if (!hass.ws) throw new Error('Home Assistant non è collegato');
  if (!hass.states[PRICE_ID]) {
    await hass.ws({
      type: 'input_number/create', name: 'Costo energia', icon: 'mdi:currency-eur',
      min: 0, max: 2, step: 0.0001, mode: 'box', unit_of_measurement: '€/kWh',
    });
  }
  await hass.ws({ type: 'call_service', domain: 'input_number', service: 'set_value', service_data: { entity_id: PRICE_ID, value } });
}

/** Valori di una serie negli istanti della griglia (crescente): per ciascuno l'ultimo registrato
 *  prima, perché HA salva solo i cambiamenti. Una sola passata sulla serie. */
export function valuesAt(series: HistoryPoint[], grid: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let v = NaN;
  for (const t of grid) {
    while (i < series.length && series[i].t <= t) v = series[i++].v;
    out.push(v);
  }
  return out;
}
