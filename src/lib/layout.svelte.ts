// Quali entità compaiono nella Casa. Fase 1: salvato nel browser.
// Fase 2: da valutare il salvataggio nei dati utente di HA
// (frontend/set_user_data), così telefono, PC e pannello vedono la stessa casa.

const KEY = 'ha-dashboard.casa';

const DEFAULT = [
  'light.soggiorno_soffitto', 'light.soggiorno_lampada', 'light.soggiorno_striscia_tv',
  'climate.termostato',
  'light.cucina_pensili', 'switch.presa_friggitrice',
  'light.camera_comodino',
  'light.ufficio_scrivania', 'switch.presa_stampante3d',
  'switch.presa_lavatrice',
  'camera.soggiorno', 'camera.ufficio',
];

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT;
}

class Layout {
  pinned = $state<string[]>(load());

  has(id: string) {
    return this.pinned.includes(id);
  }
  add(id: string) {
    if (!this.has(id)) this.pinned = [...this.pinned, id];
    this.save();
  }
  remove(id: string) {
    this.pinned = this.pinned.filter((p) => p !== id);
    this.save();
  }
  private save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.pinned)); } catch {}
  }
}

export const layout = new Layout();
