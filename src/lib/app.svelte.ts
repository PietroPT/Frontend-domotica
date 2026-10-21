// Navigazione, foglio aperto e tema. Lo stato vive nell'indirizzo (#/pagina)
// così il tasto Indietro del telefono e il pannello kiosk si comportano bene.

export type Page = 'casa' | 'luci' | 'clima' | 'energia' | 'telecamere' | 'avanzate';
export type Sheet = null | { kind: 'luce' | 'presa' | 'telecamera' | 'crocchette'; id: string } | { kind: 'aggiungi' };
export type Theme = 'auto' | 'chiaro' | 'scuro';

const PAGES: Page[] = ['casa', 'luci', 'clima', 'energia', 'telecamere', 'avanzate'];

function readHash(): { page: Page; sheet: Sheet } {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const page = (PAGES as string[]).includes(path) ? (path as Page) : 'casa';
  const sp = new URLSearchParams(query).get('foglio');
  let sheet: Sheet = null;
  if (sp === 'aggiungi') sheet = { kind: 'aggiungi' };
  else if (sp) {
    const [kind, id] = sp.split(':');
    if (kind === 'luce' || kind === 'presa' || kind === 'telecamera' || kind === 'crocchette') sheet = { kind, id };
  }
  return { page, sheet };
}

function storedTheme(): Theme {
  try { return (localStorage.getItem('ha-dashboard.tema') as Theme) || 'auto'; } catch { return 'auto'; }
}

class AppState {
  page = $state<Page>(readHash().page);
  sheet = $state<Sheet>(readHash().sheet);
  theme = $state<Theme>(storedTheme());
  /** Avanzate resta sbloccata solo finché non si esce dalla pagina. */
  unlocked = $state(readHash().page === 'avanzate');

  constructor() {
    addEventListener('hashchange', () => {
      const h = readHash();
      this.page = h.page;
      this.sheet = h.sheet;
      if (h.page !== 'avanzate') this.unlocked = false;
    });
  }

  private push(page: Page, sheet: Sheet) {
    const q = sheet ? `?foglio=${sheet.kind === 'aggiungi' ? 'aggiungi' : `${sheet.kind}:${sheet.id}`}` : '';
    location.hash = `#/${page}${q}`;
  }
  go(page: Page) {
    if (page === 'avanzate' && !this.unlocked) return;
    this.push(page, null);
  }
  open(sheet: Exclude<Sheet, null>) {
    this.push(this.page, sheet);
  }
  close() {
    // replace: chiudere un foglio non lascia una voce in più nella cronologia
    location.replace(`#/${this.page}`);
  }
  unlock() {
    this.unlocked = true;
    this.push('avanzate', null);
  }
  setTheme(t: Theme) {
    this.theme = t;
    try { localStorage.setItem('ha-dashboard.tema', t); } catch {}
  }
}

export const app = new AppState();
