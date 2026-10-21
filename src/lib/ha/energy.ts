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
