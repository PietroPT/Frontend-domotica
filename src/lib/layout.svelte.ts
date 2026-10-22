// Quali entità compaiono nella Casa e in che ordine. Dal 22/10 è una sola disposizione per tutti
// (scelta di Pietro): sta nel CT 203 (/api/casa, deploy/bollette.py), così telefono, PC, pannello
// e ogni utente vedono la stessa Casa. Il browser ne tiene una copia per partire subito.
// Finché nessuno ha mai salvato, vale la scelta fatta prima su questo dispositivo; se non c'è
// neanche quella, con Home Assistant collegato si vedono tutte le luci, prese, termostati e
// telecamere (tranne l'infrastruttura, vedi canPin).
// Fra gli interruttori solo le prese vere, cioè quelli con un sensore di potenza:
// gli altri (es. «Permit join» di Zigbee2MQTT, i comandi del distributore di
// crocchette) non sono dispositivi da accendere e spegnere dalla Casa.

import { hass } from './ha/hass.svelte';
import { api } from './api';
import { canPin, powerOf } from './view';

// Chiave diversa per il mockup: le scelte fatte sui dati finti non toccano la casa vera.
const KEY = hass.demo ? 'ha-dashboard.casa.demo' : 'ha-dashboard.casa';

const DEMO_DEFAULT = [
  'light.soggiorno_soffitto', 'light.soggiorno_lampada', 'light.soggiorno_striscia_tv',
  'climate.termostato',
  'light.cucina_pensili', 'switch.presa_friggitrice', 'text.crocchette_alimentazione_manuale',
  'light.camera_comodino',
  'light.ufficio_scrivania', 'switch.presa_stampante3d',
  'switch.presa_lavatrice',
  'camera.soggiorno', 'camera.ufficio',
];

function load(): string[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

class Layout {
  private local = $state<string[] | null>(load());
  /** Dal CT 203: undefined = non ancora letta, null = nessuno l'ha mai salvata. */
  private shared = $state<string[] | null | undefined>(undefined);
  /** Modalità «Modifica» della Casa: frecce sui riquadri, niente accensioni. */
  editing = $state(false);
  pinned = $derived(
    this.shared ??
      this.local ??
      (hass.demo
        ? DEMO_DEFAULT
        : Object.keys(hass.states).filter((id) => canPin(id) && !id.startsWith('sensor.') && (!id.startsWith('switch.') || !!powerOf(id)))),
  );

  constructor() {
    // Si rilegge all'avvio, ogni 5 minuti e quando la pagina torna in primo piano (pannello sempre acceso).
    $effect.root(() => {
      $effect(() => { if (hass.status === 'ready') this.sync(); });
    });
    setInterval(() => this.sync(), 5 * 60_000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.sync(); });
  }

  async sync() {
    if (hass.demo || hass.status !== 'ready' || this.editing) return;
    try {
      const d = await api('GET', 'casa');
      if (this.editing) return;
      this.shared = d.riquadri ?? null;
      if (d.riquadri) this.keep(d.riquadri);
    } catch {
      // Servizio non raggiungibile: resta la copia di questo dispositivo.
    }
  }

  has(id: string) {
    return this.pinned.includes(id);
  }
  add(id: string) {
    if (!this.has(id)) this.save([...this.pinned, id]);
  }
  remove(id: string) {
    this.save(this.pinned.filter((p) => p !== id));
  }
  /** Scambia di posto due riquadri (le frecce della modalità Modifica). */
  swap(a: string, b: string) {
    const list = [...this.pinned];
    const i = list.indexOf(a), j = list.indexOf(b);
    if (i < 0 || j < 0) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.save(list);
  }

  private keep(list: string[]) {
    this.local = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  }
  private async save(list: string[]) {
    this.keep(list);
    if (hass.demo) return;
    this.shared = list;
    try {
      await api('PUT', 'casa', { riquadri: list });
    } catch (e: any) {
      hass.say(`Disposizione della Casa non salvata: ${e?.message ?? e}`);
    }
  }
}

export const layout = new Layout();
