// Come si presenta un'entità di HA in un riquadro: icona, testo, colore, comandi.
// Le icone si scelgono dall'icona mdi impostata in HA, poi dal tipo e dal nome,
// così le entità nuove ricevono un'icona sensata senza scriverle a mano.

import { hass } from './ha/hass.svelte';
import { app } from './app.svelte';
import { policyOf } from './policy';
import { since, temp, watt } from './format';
import type { IconName } from './icons';
import type { HassEntity } from './ha/types';

const MDI: Record<string, IconName> = {
  'mdi:lamp': 'lampada', 'mdi:floor-lamp': 'lampada', 'mdi:led-strip': 'striscia', 'mdi:led-strip-variant': 'striscia',
  'mdi:lightbulb': 'luce', 'mdi:ceiling-light': 'luce', 'mdi:washing-machine': 'lavatrice', 'mdi:printer-3d': 'stampante3d',
  'mdi:server': 'rack', 'mdi:power-socket-eu': 'presa', 'mdi:thermostat': 'termostato', 'mdi:cctv': 'telecamera',
};

const BY_NAME: [RegExp, IconName][] = [
  [/lavatric/i, 'lavatrice'], [/stampant|core.?one|prusa/i, 'stampante3d'], [/friggit/i, 'friggitrice'],
  [/rack/i, 'rack'], [/lampad|abat|piantan/i, 'lampada'], [/strisc|led/i, 'striscia'], [/crocchett|petkit/i, 'crocchette'],
  [/ups/i, 'ups'], [/riavvi/i, 'riavvio'], [/avviso|notific|scollegat/i, 'notifica'],
];

export function iconOf(e: HassEntity): IconName {
  const mdi = e.attributes.icon && MDI[e.attributes.icon];
  if (mdi) return mdi;
  const text = `${e.entity_id} ${e.attributes.friendly_name ?? ''}`;
  for (const [re, ic] of BY_NAME) if (re.test(text)) return ic;
  const domain = e.entity_id.split('.')[0];
  if (domain === 'light') return 'luce';
  if (domain === 'climate') return 'termostato';
  if (domain === 'camera') return 'telecamera';
  if (domain === 'switch') return 'presa';
  if (domain === 'automation') return 'automazione';
  if (e.attributes.device_class === 'power') return 'energia';
  if (e.attributes.device_class === 'motion') return 'movimento';
  return 'stella';
}

/** Nome breve: toglie il nome della stanza e i suffissi tecnici. */
export function nameOf(e: HassEntity): string {
  return (e.attributes.friendly_name ?? e.entity_id).replace(/ (Potenza|Power)$/i, '');
}

export interface TileView {
  id: string;
  icon: IconName;
  title: string;
  detail: string;
  on: boolean;
  color: string;
  locked?: boolean;
  toggle?: () => void;
  open?: () => void;
}

export function tileOf(id: string): TileView | null {
  const e = hass.states[id];
  if (!e) return null;
  const domain = id.split('.')[0];
  const base = { id, icon: iconOf(e), title: nameOf(e) };

  if (domain === 'light') {
    const on = e.state === 'on';
    const pct = Math.round(((e.attributes.brightness ?? 0) / 255) * 100);
    return {
      ...base, on, color: 'var(--luci)',
      detail: on ? (e.attributes.brightness != null ? `${pct}%` : 'Accesa') : 'Spenta',
      toggle: () => hass.callService('light', on ? 'turn_off' : 'turn_on', { entity_id: id }),
      open: e.attributes.supported_color_modes?.some((m: string) => m !== 'onoff') ? () => app.open({ kind: 'luce', id }) : undefined,
    };
  }

  if (domain === 'climate') {
    const off = e.state === 'off';
    return {
      ...base, on: !off, color: 'var(--clima)',
      detail: off ? `Spento · ${temp(e.attributes.current_temperature)}` : `${e.attributes.hvac_action === 'heating' ? 'Riscalda' : 'Tiene'} a ${temp(e.attributes.temperature)}`,
      open: () => app.go('clima'),
    };
  }

  if (domain === 'switch') {
    const on = e.state === 'on';
    const w = hass.num(id.replace('switch.', 'sensor.') + '_power');
    const p = policyOf(id);
    const canToggle = !p.readOnly && !(p.noRemoteOn && !on);
    return {
      ...base, on, color: 'var(--energia)',
      detail: on ? (Number.isFinite(w) ? watt(w) : 'Accesa') : 'Spenta',
      locked: !!p.noRemoteOn && !on,
      toggle: canToggle ? () => app.open({ kind: 'presa', id }) : undefined,
      open: () => app.open({ kind: 'presa', id }),
    };
  }

  if (domain === 'sensor' && e.attributes.device_class === 'power') {
    return {
      ...base, on: true, color: id.includes('rack') ? 'var(--rack)' : 'var(--energia)',
      detail: watt(+e.state),
      locked: !!policyOf(id).readOnly,
      open: () => app.go('energia'),
    };
  }

  if (domain === 'camera') {
    return { ...base, on: false, color: 'var(--sicurezza)', detail: 'Dal vivo', open: () => app.open({ kind: 'telecamera', id }) };
  }

  return { ...base, on: e.state === 'on', color: 'var(--ink-3)', detail: `${e.state} · ${since(e.last_changed)}` };
}
