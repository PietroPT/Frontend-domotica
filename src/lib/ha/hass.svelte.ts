// Stato condiviso di Home Assistant per tutta l'app.
// Due sorgenti con le stesse proprietà:
// - collegamento vero (fase 2): stati da subscribeEntities, registri via WebSocket, vedi ./live.ts;
// - dati finti del mockup (./mock.ts) quando VITE_HA_URL non è impostato o l'indirizzo
//   contiene ?demo, così il mockup resta apribile senza Home Assistant.

import * as mock from './mock';
import { policyOf } from '../policy';
import type { AreaEntry, DeviceRegistryEntry, EntityRegistryEntry, HassEntity, HistoryPoint } from './types';

export const HA_URL: string = (import.meta.env.VITE_HA_URL ?? '').replace(/\/$/, '');
const DEMO = !HA_URL || new URLSearchParams(location.search).has('demo');

export type Status = 'connecting' | 'ready' | 'error';

class Hass {
  /** true finché i dati sono quelli finti del mockup */
  readonly demo = DEMO;
  states = $state<Record<string, HassEntity>>(DEMO ? structuredClone(mock.states) : {});
  areas = $state<AreaEntry[]>(DEMO ? mock.areas : []);
  devices = $state<DeviceRegistryEntry[]>(DEMO ? mock.devices : []);
  entityRegistry = $state<EntityRegistryEntry[]>(DEMO ? mock.entityRegistry : []);
  status = $state<Status>(DEMO ? 'ready' : 'connecting');
  /** Spiegazione da mostrare quando status è 'error'. */
  error = $state('');
  /** false quando la connessione cade dopo essere stata aperta (si riprova da sola). */
  connected = $state(true);
  /** Nome dell'utente di HA con cui si è entrati. */
  user = $state('');
  /** true sul pannello a muro, che entra col token a lunga durata invece del login. */
  panel = $state(false);
  /** Invio di un messaggio a HA: lo imposta live.ts quando la connessione è aperta. */
  ws: ((msg: { type: string; [key: string]: unknown }) => Promise<unknown>) | null = null;
  /** Avviso breve mostrato in basso (es. comando non inviato). */
  notice = $state('');
  /** Telecamere con l'immagine più alta che larga (la misura arriva col primo fotogramma). */
  portrait = $state<Record<string, boolean>>({});

  private reg = $derived(new Map(this.entityRegistry.map((r) => [r.entity_id, r])));
  private dev = $derived(new Map(this.devices.map((d) => [d.id, d])));

  /** Area di un'entità: quella dell'entità, altrimenti quella del suo dispositivo (regola di HA). */
  areaOf(entity_id: string): string | null {
    const e = this.reg.get(entity_id);
    if (!e) return null;
    return e.area_id ?? (e.device_id ? this.dev.get(e.device_id)?.area_id ?? null : null);
  }

  /** Integrazione che ha creato l'entità (es. 'prusalink'), se nota. */
  platformOf(entity_id: string): string | undefined {
    return this.reg.get(entity_id)?.platform;
  }

  deviceName(entity_id: string): string {
    const d = this.reg.get(entity_id)?.device_id;
    return (d && this.dev.get(d)?.name) || '';
  }

  areaName(area_id: string | null): string {
    return this.areas.find((a) => a.area_id === area_id)?.name ?? 'Senza stanza';
  }

  /** Nascosta in HA, oppure di configurazione/diagnostica: non va proposta nella Casa. */
  isBackground(entity_id: string): boolean {
    const e = this.reg.get(entity_id);
    return !!(e?.hidden_by || e?.entity_category);
  }

  /** Entità di un'integrazione riconosciuta dal suo nome interno (es. 'nut', 'battery_charge'), se è attiva. */
  byKey(platform: string, key: string): string | undefined {
    return this.entityRegistry.find((r) => r.platform === platform && r.translation_key === key && this.states[r.entity_id])?.entity_id;
  }

  entities(domain: string): HassEntity[] {
    return Object.values(this.states).filter((s) => s.entity_id.startsWith(domain + '.'));
  }

  /** Un'altra entità dello stesso dispositivo (es. il sensore di potenza di una presa). */
  sibling(entity_id: string, match: (s: HassEntity) => boolean): HassEntity | undefined {
    const dev = this.reg.get(entity_id)?.device_id;
    if (!dev) return undefined;
    for (const r of this.entityRegistry) {
      const s = r.device_id === dev && r.entity_id !== entity_id ? this.states[r.entity_id] : undefined;
      if (s && match(s)) return s;
    }
    return undefined;
  }

  num(entity_id: string): number {
    const v = parseFloat(this.states[entity_id]?.state ?? '');
    return Number.isFinite(v) ? v : NaN;
  }

  /** Cronologia delle ultime 24 ore, riempita dal vivo da live.ts (history/stream). */
  hist = $state<Record<string, HistoryPoint[]>>({});
  /** Avvia lo streaming della cronologia di una chiave: lo imposta live.ts. */
  watchHistory: ((key: string) => void) | null = null;
  private watched = new Set<string>();

  /** Cronologia di un'entità (chiave = entity_id; per il termostato anche «climate.x:target»).
   *  La prima richiesta avvia lo streaming da HA; i punti arrivano poi da soli. */
  history(key: string): HistoryPoint[] {
    if (this.demo) return mock.history[key] ?? [];
    const watch = this.watchHistory;
    if (watch && !this.watched.has(key)) {
      this.watched.add(key);
      queueMicrotask(() => watch(key)); // fuori dal calcolo in corso: la sottoscrizione scrive stato
    }
    return this.hist[key] ?? [];
  }

  /** Indirizzo completo di un'immagine servita da HA (es. entity_picture delle telecamere). */
  url(path: string): string {
    return path.startsWith('/') ? HA_URL + path : path;
  }

  /** Regole di sicurezza applicate a ogni comando, qualunque schermata lo mandi
   *  (le conferme prima di spegnere restano nelle schermate). Restituisce il motivo del blocco. */
  private blocked(service: string, ids: string[]): string | null {
    for (const id of ids) {
      const p = policyOf(id);
      if (p.readOnly) return p.readOnly;
      if (p.noRemoteOn && (service === 'turn_on' || service === 'toggle')) return p.noRemoteOn;
    }
    return null;
  }

  /** Stessa firma di callService di home-assistant-js-websocket; restituisce false se il comando non è partito. */
  async callService(domain: string, service: string, data: Record<string, any>): Promise<boolean> {
    const ids: string[] = [data.entity_id].flat().filter(Boolean);
    const stop = this.blocked(service, ids);
    if (stop) {
      this.say(stop);
      return false;
    }
    if (!this.demo) {
      if (!this.ws || !this.connected) {
        this.say('Home Assistant non è collegato: comando non inviato.');
        return false;
      }
      try {
        await this.ws({ type: 'call_service', domain, service, service_data: data });
        return true;
      } catch (err: any) {
        this.say(`Comando non riuscito: ${err?.message ?? err}`);
        return false;
      }
    }
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
      else if (domain === 'text' && service === 'set_value') {
        // Distributore: la quantità scritta viene erogata e si somma ai totali.
        const g = +data.value || 0;
        for (const t of ['sensor.crocchette_totale_erogato', 'sensor.crocchette_erogato_manualmente']) {
          const e = this.states[t];
          if (e) this.states[t] = { ...e, state: String(+e.state + g) };
        }
      } else if (domain === 'climate' && service === 'set_temperature') set(s.state, { temperature: data.temperature });
      else if (domain === 'climate' && service === 'set_hvac_mode')
        set(data.hvac_mode, { hvac_action: data.hvac_mode === 'off' ? 'off' : s.attributes.current_temperature < s.attributes.temperature ? 'heating' : 'idle' });
    }
    // Le prese seguono il relè: spenta = 0 W.
    for (const id of ids.filter((i) => i.startsWith('switch.'))) {
      const p = this.sibling(id, (s) => s.attributes.device_class === 'power');
      if (this.states[id].state === 'off' && p) this.states[p.entity_id] = { ...p, state: '0' };
    }
    return true;
  }

  /** Rinomina un'entità in HA (registro delle entità). Nome vuoto = torna al nome originale.
   *  Non è un comando a un dispositivo: cambia solo il nome visibile, non l'entity_id. */
  async rename(entity_id: string, name: string): Promise<void> {
    const clean = name.trim() || null;
    if (this.demo) {
      const s = this.states[entity_id];
      const original = mock.states[entity_id]?.attributes.friendly_name ?? entity_id;
      if (s) this.states[entity_id] = { ...s, attributes: { ...s.attributes, friendly_name: clean ?? original } };
      return;
    }
    if (!this.ws) throw new Error('Home Assistant non è collegato');
    await this.ws({ type: 'config/entity_registry/update', entity_id, name: clean });
  }

  private noticeTimer = 0;
  say(text: string) {
    this.notice = text;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => (this.notice = ''), 4000);
  }
}

export const hass = new Hass();

if (hass.demo) {
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
}
