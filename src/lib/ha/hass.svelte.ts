// Stato condiviso di Home Assistant per tutta l'app.
// Fase 1: alimentato dai dati finti di ./mock.ts, con piccole variazioni
// periodiche per simulare gli aggiornamenti in tempo reale.
// Fase 2: le stesse proprietà verranno riempite da subscribeEntities e dai
// registri letti via WebSocket; callService userà la connessione vera.

import * as mock from './mock';
import type { AreaEntry, DeviceRegistryEntry, EntityRegistryEntry, HassEntity, HistoryPoint } from './types';

class Hass {
  states = $state<Record<string, HassEntity>>(structuredClone(mock.states));
  areas = $state<AreaEntry[]>(mock.areas);
  devices = $state<DeviceRegistryEntry[]>(mock.devices);
  entityRegistry = $state<EntityRegistryEntry[]>(mock.entityRegistry);
  connected = $state(true);
  /** true finché i dati sono quelli finti del mockup */
  demo = true;

  /** Area di un'entità: quella dell'entità, altrimenti quella del suo dispositivo (regola di HA). */
  areaOf(entity_id: string): string | null {
    const e = this.entityRegistry.find((r) => r.entity_id === entity_id);
    if (!e) return null;
    if (e.area_id) return e.area_id;
    return this.devices.find((d) => d.id === e.device_id)?.area_id ?? null;
  }

  areaName(area_id: string | null): string {
    return this.areas.find((a) => a.area_id === area_id)?.name ?? 'Senza stanza';
  }

  entities(domain: string): HassEntity[] {
    return Object.values(this.states).filter((s) => s.entity_id.startsWith(domain + '.'));
  }

  num(entity_id: string): number {
    const v = parseFloat(this.states[entity_id]?.state ?? '');
    return Number.isFinite(v) ? v : NaN;
  }

  history(key: string): HistoryPoint[] {
    return mock.history[key] ?? [];
  }

  /** Stessa firma di callService di home-assistant-js-websocket. */
  async callService(domain: string, service: string, data: Record<string, any>): Promise<void> {
    const ids: string[] = [data.entity_id].flat();
    for (const id of ids) {
      const s = this.states[id];
      if (!s) continue;
      const stamp = new Date().toISOString();
      const set = (state: string, attrs: Record<string, any> = {}) => {
        this.states[id] = { ...s, state, attributes: { ...s.attributes, ...attrs }, last_changed: state !== s.state ? stamp : s.last_changed, last_updated: stamp };
      };
      if (domain === 'light' && service === 'turn_on') {
        const b = data.brightness_pct != null ? Math.round((data.brightness_pct / 100) * 255) : s.attributes.brightness ?? 255;
        set('on', { brightness: b, ...(data.color_temp_kelvin ? { color_temp_kelvin: data.color_temp_kelvin } : {}) });
      } else if (domain === 'light' && service === 'turn_off') set('off', { brightness: null });
      else if ((domain === 'switch' || domain === 'automation') && service === 'turn_on') set('on');
      else if ((domain === 'switch' || domain === 'automation') && service === 'turn_off') set('off');
      else if (domain === 'climate' && service === 'set_temperature') set(s.state, { temperature: data.temperature });
      else if (domain === 'climate' && service === 'set_hvac_mode')
        set(data.hvac_mode, { hvac_action: data.hvac_mode === 'off' ? 'off' : s.attributes.current_temperature < s.attributes.temperature ? 'heating' : 'idle' });
    }
    // Le prese seguono il relè: spenta = 0 W.
    for (const id of ids.filter((i) => i.startsWith('switch.presa_'))) {
      const p = id.replace('switch.', 'sensor.') + '_power';
      if (this.states[id].state === 'off' && this.states[p]) this.states[p] = { ...this.states[p], state: '0' };
    }
  }
}

export const hass = new Hass();

// Simulazione "dal vivo": i consumi oscillano come farebbero i sensori veri.
const jitter: Record<string, [base: number, spread: number]> = {
  'sensor.presa_rack_power': [140, 10],
  'sensor.presa_lavatrice_power': [1830, 70],
  'sensor.presa_stampante3d_power': [156, 14],
  'sensor.ups_load': [43, 2],
};
setInterval(() => {
  for (const [id, [base, spread]] of Object.entries(jitter)) {
    const s = hass.states[id];
    if (!s || s.state === '0') continue;
    const sw = id.replace('sensor.', 'switch.').replace(/_power$/, '');
    if (hass.states[sw]?.state === 'off') continue;
    hass.states[id] = { ...s, state: String(Math.round(base + (Math.random() - 0.5) * spread)), last_updated: new Date().toISOString() };
  }
}, 2500);
