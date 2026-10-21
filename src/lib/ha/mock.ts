// DATI FINTI della fase 1 (mockup). Nomi e comportamenti delle prese, del
// termostato, dell'UPS e di Frigate seguono la documentazione del Rack;
// le luci e le aree di cucina, camera e bagno sono inventate per il mockup.
// Nella fase 2 questo file non viene più usato: tutto arriva da Home Assistant.

import type {
  AreaEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  HassEntity,
  HistoryPoint,
} from './types';

export const areas: AreaEntry[] = [
  { area_id: 'soggiorno', name: 'Soggiorno', icon: 'mdi:sofa' },
  { area_id: 'cucina', name: 'Cucina', icon: 'mdi:stove' },
  { area_id: 'camera_da_letto', name: 'Camera', icon: 'mdi:bed' },
  { area_id: 'ufficio', name: 'Ufficio', icon: 'mdi:desk' },
  { area_id: 'bagno', name: 'Bagno', icon: 'mdi:shower' },
];

export const devices: DeviceRegistryEntry[] = [
  { id: 'd_termostato', name: 'Termostato', area_id: 'soggiorno' },
  { id: 'd_ups', name: 'Ups', area_id: 'soggiorno' },
  { id: 'd_presa_rack', name: 'presa_rack', area_id: 'soggiorno' },
  { id: 'd_presa_lavatrice', name: 'presa_lavatrice', area_id: 'bagno' },
  { id: 'd_presa_stampante3d', name: 'presa_stampante3d', area_id: 'ufficio' },
  { id: 'd_presa_friggitrice', name: 'presa_friggitrice', area_id: 'cucina' },
  { id: 'd_cam_soggiorno', name: 'Soggiorno', area_id: 'soggiorno' },
  { id: 'd_cam_ufficio', name: 'Ufficio', area_id: 'ufficio' },
  { id: 'd_core_one', name: 'Core One', area_id: 'ufficio' },
  { id: 'd_z2m', name: 'Zigbee2MQTT Bridge', area_id: null },
  { id: 'd_petkit', name: 'Distributore crocchette', area_id: 'cucina' },
];

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const min = 60_000;

type Def = [entity_id: string, state: string, attributes: Record<string, any>, device: string | null, changedMinAgo?: number];

const defs: Def[] = [
  // Luci (inventate)
  ['light.soggiorno_soffitto', 'on', { friendly_name: 'Soffitto', brightness: 179, color_mode: 'color_temp', color_temp_kelvin: 2900, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500, supported_color_modes: ['color_temp'] }, null, 95],
  ['light.soggiorno_lampada', 'off', { friendly_name: 'Lampada da terra', supported_color_modes: ['brightness'] }, null, 300],
  ['light.soggiorno_striscia_tv', 'on', { friendly_name: 'Striscia TV', brightness: 77, color_mode: 'hs', hs_color: [28, 70], supported_color_modes: ['hs', 'color_temp'] }, null, 80],
  ['light.cucina_pensili', 'on', { friendly_name: 'Pensili', brightness: 255, supported_color_modes: ['brightness'] }, null, 40],
  ['light.camera_comodino', 'off', { friendly_name: 'Comodino', supported_color_modes: ['brightness'] }, null, 600],
  ['light.ufficio_scrivania', 'on', { friendly_name: 'Scrivania', brightness: 230, supported_color_modes: ['brightness'] }, null, 130],
  ['light.bagno_specchio', 'off', { friendly_name: 'Specchio', supported_color_modes: ['onoff'] }, null, 900],

  // Termostato MOES ZHT-S03 via Zigbee2MQTT
  ['climate.termostato', 'heat', { friendly_name: 'Termostato', current_temperature: 20.5, temperature: 21, hvac_modes: ['off', 'heat'], hvac_action: 'heating', min_temp: 5, max_temp: 35, target_temp_step: 0.5, preset_mode: 'manual' }, 'd_termostato', 25],

  // Prese SONOFF S60ZBTPF (Zigbee2MQTT)
  ['switch.presa_lavatrice', 'on', { friendly_name: 'Lavatrice' }, 'd_presa_lavatrice', 24],
  ['sensor.presa_lavatrice_power', '1842', { friendly_name: 'Lavatrice Potenza', unit_of_measurement: 'W', device_class: 'power' }, 'd_presa_lavatrice'],
  ['sensor.presa_lavatrice_energy', '418.36', { friendly_name: 'Lavatrice Energia', unit_of_measurement: 'kWh', device_class: 'energy', state_class: 'total_increasing' }, 'd_presa_lavatrice'],
  ['switch.presa_stampante3d', 'on', { friendly_name: 'Stampante 3D' }, 'd_presa_stampante3d', 190],
  ['sensor.presa_stampante3d_power', '158', { friendly_name: 'Stampante 3D Potenza', unit_of_measurement: 'W', device_class: 'power' }, 'd_presa_stampante3d'],
  ['sensor.presa_stampante3d_energy', '96.12', { friendly_name: 'Stampante 3D Energia', unit_of_measurement: 'kWh', device_class: 'energy', state_class: 'total_increasing' }, 'd_presa_stampante3d'],
  // switch.presa_rack è disattivata in HA (08/10): qui non esiste, come nella realtà.
  ['sensor.presa_rack_power', '142', { friendly_name: 'Rack Potenza', unit_of_measurement: 'W', device_class: 'power' }, 'd_presa_rack'],
  ['sensor.presa_rack_energy', '512.9', { friendly_name: 'Rack Energia', unit_of_measurement: 'kWh', device_class: 'energy', state_class: 'total_increasing' }, 'd_presa_rack'],
  ['sensor.presa_rack_voltage', '229', { friendly_name: 'Rack Tensione', unit_of_measurement: 'V', device_class: 'voltage' }, 'd_presa_rack'],
  ['switch.presa_friggitrice', 'off', { friendly_name: 'Friggitrice ad aria' }, 'd_presa_friggitrice', 1500],
  ['sensor.presa_friggitrice_power', '0', { friendly_name: 'Friggitrice Potenza', unit_of_measurement: 'W', device_class: 'power' }, 'd_presa_friggitrice'],
  ['sensor.presa_friggitrice_energy', '31.4', { friendly_name: 'Friggitrice Energia', unit_of_measurement: 'kWh', device_class: 'energy', state_class: 'total_increasing' }, 'd_presa_friggitrice'],

  // UPS EPYC NEON via NUT (sola lettura)
  ['sensor.ups_status', 'Online', { friendly_name: 'Ups Stato' }, 'd_ups'],
  ['sensor.ups_status_data', 'OL', { friendly_name: 'Ups Dati di stato' }, 'd_ups'],
  ['sensor.ups_battery_charge', '100', { friendly_name: 'Ups Carica batterie', unit_of_measurement: '%', device_class: 'battery' }, 'd_ups'],
  ['sensor.ups_load', '43', { friendly_name: 'Ups Carico', unit_of_measurement: '%' }, 'd_ups'],
  ['sensor.ups_battery_runtime', '540', { friendly_name: 'Ups Autonomia della batteria', unit_of_measurement: 's', device_class: 'duration' }, 'd_ups'],
  ['sensor.ups_input_voltage', '229', { friendly_name: 'Ups Tensione di ingresso', unit_of_measurement: 'V', device_class: 'voltage' }, 'd_ups'],

  // Frigate
  ['camera.soggiorno', 'streaming', { friendly_name: 'Soggiorno', orientation: 'portrait' }, 'd_cam_soggiorno'],
  ['camera.ufficio', 'streaming', { friendly_name: 'Ufficio' }, 'd_cam_ufficio'],
  ['binary_sensor.soggiorno_motion', 'off', { friendly_name: 'Soggiorno Movimento', device_class: 'motion' }, 'd_cam_soggiorno', 35],
  ['binary_sensor.ufficio_motion', 'on', { friendly_name: 'Ufficio Movimento', device_class: 'motion' }, 'd_cam_ufficio', 2],

  // Stampante Prusa Core One (PrusaLink)
  ['sensor.core_one', 'printing', { friendly_name: 'Core One' }, 'd_core_one', 190],
  ['sensor.core_one_progress', '64', { friendly_name: 'Core One Avanzamento', unit_of_measurement: '%' }, 'd_core_one'],
  ['sensor.core_one_filename', 'Supporto_mensola.bgcode', { friendly_name: 'Core One File' }, 'd_core_one'],
  ['sensor.core_one_print_finish', new Date(now + 72 * min).toISOString(), { friendly_name: 'Core One Fine stampa', device_class: 'timestamp' }, 'd_core_one'],

  // Servizi
  ['binary_sensor.zigbee2mqtt_bridge_connection_state', 'on', { friendly_name: 'Zigbee2MQTT Bridge Stato connessione', device_class: 'connectivity' }, 'd_z2m', 3 * 24 * 60],
  ['sensor.crocchette_livello', 'Normale', { friendly_name: 'Crocchette Livello' }, 'd_petkit', 400],
  ['automation.zigbee2mqtt_riavvio_se_fermo', 'on', { friendly_name: 'Zigbee2MQTT - riavvio se fermo', last_triggered: iso(5 * min) }, null],
  ['automation.zigbee2mqtt_avviso_se_scollegato', 'on', { friendly_name: 'Zigbee2MQTT - avviso se scollegato', last_triggered: iso(2 * 24 * 60 * min) }, null],
  ['automation.allarme_crocchette', 'on', { friendly_name: 'Allarme crocchette', last_triggered: iso(5 * 24 * 60 * min) }, null],
];

export const states: Record<string, HassEntity> = Object.fromEntries(
  defs.map(([entity_id, state, attributes, , ago = 10]) => [
    entity_id,
    { entity_id, state, attributes, last_changed: iso(ago * min), last_updated: iso(Math.min(ago, 1) * min) },
  ]),
);

export const entityRegistry: EntityRegistryEntry[] = defs.map(([entity_id, , , device]) => {
  // Le luci finte hanno l'area sull'entità (non c'è un dispositivo).
  const area = entity_id.startsWith('light.') ? entity_id.split('.')[1].split('_')[0] : null;
  return {
    entity_id,
    device_id: device,
    area_id: area === 'camera' ? 'camera_da_letto' : area,
    disabled_by: null,
    hidden_by: null,
  };
});

// Cronologia finta: forme plausibili, non misure.
function series(hours: number, stepMin: number, f: (h: number) => number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let m = hours * 60; m >= 0; m -= stepMin) {
    const t = now - m * min;
    const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    out.push({ t, v: Math.max(0, f(h)) });
  }
  return out;
}
const noise = (a: number) => (Math.random() - 0.5) * a;

// Negli ultimi minuti le serie seguono lo stato attuale (lavatrice accesa da
// 24 min, stampa da 190 min), così il punto «ora» coincide con il valore mostrato.
function recent(s: HistoryPoint[], minutes: number, f: () => number): HistoryPoint[] {
  return s.map((p) => (p.t >= now - minutes * min ? { t: p.t, v: f() } : p));
}

export const history: Record<string, HistoryPoint[]> = {
  'sensor.presa_rack_power': series(24, 5, (h) => 136 + Math.sin(h * 1.7) * 4 + (h > 2 && h < 3 ? 18 : 0) + noise(3)),
  'sensor.presa_stampante3d_power': recent(series(24, 5, () => 2), 190, () => 155 + noise(16)),
  'sensor.presa_lavatrice_power': recent(series(24, 5, (h) => (h > 21.3 && h < 21.55 ? 1850 + noise(80) : h >= 21.55 && h < 22.4 ? 160 + noise(60) : 0.4)), 24, () => 1830 + noise(60)),
  'sensor.presa_friggitrice_power': series(24, 5, (h) => (h > 19.7 && h < 20.1 ? 1450 + noise(120) : 0)),
  'climate.termostato': series(24, 15, (h) => 19.2 + Math.sin(((h - 9) / 24) * Math.PI * 2) * 0.9 + (h > 17 ? 0.8 : 0) + noise(0.15)),
  'climate.termostato:target': series(24, 15, (h) => (h >= 6.5 && h < 23 ? 21 : 18)),
};
