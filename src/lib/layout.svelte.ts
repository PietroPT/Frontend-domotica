// Quali entità compaiono nella Casa. Salvato nel browser del dispositivo.
// Finché non si sceglie nulla, con Home Assistant collegato si vedono tutte le
// luci, prese, termostati e telecamere (tranne l'infrastruttura, vedi canPin).
// Fra gli interruttori solo le prese vere, cioè quelli con un sensore di potenza:
// gli altri (es. «Permit join» di Zigbee2MQTT, i comandi del distributore di
// crocchette) non sono dispositivi da accendere e spegnere dalla Casa.
// Da valutare: il salvataggio nei dati utente di HA (frontend/set_user_data),
// così telefono, PC e pannello vedono la stessa casa.

import { hass } from './ha/hass.svelte';
import { canPin, powerOf } from './view';

// Chiave diversa per il mockup: le scelte fatte sui dati finti non toccano la casa vera.
const KEY = hass.demo ? 'ha-dashboard.casa.demo' : 'ha-dashboard.casa';

const DEMO_DEFAULT = [
  'light.soggiorno_soffitto', 'light.soggiorno_lampada', 'light.soggiorno_striscia_tv',
  'climate.termostato',
  'light.cucina_pensili', 'switch.presa_friggitrice',
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
  private saved = $state<string[] | null>(load());
  pinned = $derived(
    this.saved ??
      (hass.demo
        ? DEMO_DEFAULT
        : Object.keys(hass.states).filter((id) => canPin(id) && !id.startsWith('sensor.') && (!id.startsWith('switch.') || !!powerOf(id)))),
  );

  has(id: string) {
    return this.pinned.includes(id);
  }
  add(id: string) {
    if (!this.has(id)) this.save([...this.pinned, id]);
  }
  remove(id: string) {
    this.save(this.pinned.filter((p) => p !== id));
  }
  private save(list: string[]) {
    this.saved = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  }
}

export const layout = new Layout();
