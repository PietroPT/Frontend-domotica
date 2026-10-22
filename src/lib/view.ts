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
  if (e.attributes.device_class === 'motion' || e.attributes.device_class === 'occupancy') return 'movimento';
  if (domain === 'alarm_control_panel') return 'allarme';
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
      open: () => app.open({ kind: 'luce', id }),
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
    const w = hass.num(powerOf(id)?.entity_id ?? '');
    const p = policyOf(id);
    const canToggle = !p.readOnly;
    return {
      ...base, on, color: 'var(--energia)',
      detail: on ? (Number.isFinite(w) ? watt(w) : 'Accesa') : 'Spenta',
      toggle: canToggle ? () => app.open({ kind: 'presa', id }) : undefined,
      open: () => app.open({ kind: 'presa', id }),
    };
  }

  if (domain === 'sensor' && e.attributes.device_class === 'power') {
    return {
      ...base, on: true, color: id.includes('rack') ? 'var(--rack)' : 'var(--energia)',
      detail: watt(+e.state),
      locked: !!policyOf(id).readOnly,
      open: () => app.open({ kind: 'presa', id }),
    };
  }

  // Cibo extra del distributore PetKit (entità text dell'alimentazione manuale).
  if (isFeeder(id)) {
    const g = hass.states['sensor.crocchette_totale_erogato']?.state;
    const low = hass.states['binary_sensor.crocchette_livello_cibo']?.state === 'on';
    return {
      ...base, icon: 'crocchette', title: 'Cibo extra', on: false, color: 'var(--clima)',
      detail: low ? 'Cibo in esaurimento' : g ? `Oggi ${g} g` : 'Distributore',
      toggle: () => app.open({ kind: 'crocchette', id }),
      open: () => app.open({ kind: 'crocchette', id }),
    };
  }

  if (domain === 'camera') {
    return { ...base, on: false, color: 'var(--sicurezza)', detail: 'Dal vivo', open: () => app.open({ kind: 'telecamera', id }) };
  }

  return { ...base, on: e.state === 'on', color: 'var(--ink-3)', detail: `${e.state} · ${since(e.last_changed)}` };
}

/** Telecamere della casa: esclusa quella della stampante 3D (PrusaLink), che serve solo per le stampe (Pietro, 21/10). */
export const isHomeCamera = (id: string) =>
  id.startsWith('camera.') && hass.platformOf(id) !== 'prusalink' && !/prusa|core.?one/i.test(`${id} ${hass.deviceName(id)}`);

/** Alimentazione manuale del distributore di crocchette: nella Casa diventa il pulsante «Cibo extra». */
export const isFeeder = (id: string) => /^text\..*crocchett.*alimentazione_manuale$/.test(id);

/** Si può mettere nella Casa: luci, prese, termostato, telecamere, sensori di potenza.
 *  L'infrastruttura (rack, UPS) sta solo in Avanzate; le entità nascoste o tecniche di HA restano fuori. */
export function canPin(id: string): boolean {
  const s = hass.states[id];
  if (!s || hass.isBackground(id) || policyOf(id).readOnly) return false;
  if (/(^|[._ ])ups([._ ]|$)/i.test(`${id} ${hass.deviceName(id)}`)) return false;
  const d = id.split('.')[0];
  if (d === 'camera' && !isHomeCamera(id)) return false;
  return ['light', 'switch', 'climate', 'camera'].includes(d) || (d === 'sensor' && s.attributes.device_class === 'power') || isFeeder(id);
}

// Entità collegate: si cercano sullo stesso dispositivo di HA, non dal nome,
// perché i nomi reali (Zigbee2MQTT, Frigate) non seguono uno schema fisso.

/** Sensore di potenza della presa. */
export const powerOf = (switchId: string) => hass.sibling(switchId, (s) => s.attributes.device_class === 'power');

/** Presa (interruttore) a cui appartiene un sensore di potenza. */
export const switchOf = (sensorId: string) => hass.sibling(sensorId, (s) => s.entity_id.startsWith('switch.'));

/** Sensore di movimento della telecamera (Frigate ne crea uno per telecamera). */
export const motionOf = (cameraId: string) =>
  hass.sibling(cameraId, (s) => s.entity_id.startsWith('binary_sensor.') && s.attributes.device_class === 'motion');

/** Il termostato: in casa ce n'è uno solo. */
export const thermostat = () => hass.entities('climate')[0];

export const isPortrait = (c: HassEntity) => c.attributes.orientation === 'portrait' || !!hass.portrait[c.entity_id];

/** Immagine della telecamera servita da HA: fotogramma singolo o flusso continuo (MJPEG). */
export function cameraSrc(c: HassEntity, live = false): string | undefined {
  const pic: string | undefined = c.attributes.entity_picture;
  if (hass.demo || !pic) return undefined;
  return hass.url(live ? pic.replace('/api/camera_proxy/', '/api/camera_proxy_stream/') : pic);
}
