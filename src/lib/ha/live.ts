// Collegamento vero a Home Assistant con home-assistant-js-websocket.
// Accesso: il login di HA (OAuth, getAuth). Nel codice non c'è nessun token:
// HA rilascia i token dopo il login e restano solo nel browser di questo dispositivo.
// Solo il pannello a muro entra con un token a lunga durata, che sta solo sul Pi (vedi panelToken).
// Dati: stati in tempo reale (subscribeEntities) e registri di aree, dispositivi
// ed entità, riletti quando cambiano in HA. Nessuna interrogazione periodica.

import {
  createConnection,
  createLongLivedTokenAuth,
  getAuth,
  getUser,
  subscribeEntities,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
  ERR_INVALID_HTTPS_TO_HTTP,
  type Auth,
  type AuthData,
  type Connection,
} from 'home-assistant-js-websocket';
import { hass, HA_URL } from './hass.svelte';
import type { HistoryPoint } from './types';

const TOKENS = 'ha-dashboard.accesso';

function loadTokens(): AuthData | null {
  try {
    const d = JSON.parse(localStorage.getItem(TOKENS) ?? 'null');
    return d?.hassUrl === HA_URL ? d : null;
  } catch {
    return null;
  }
}

function saveTokens(d: AuthData | null) {
  try {
    if (d) localStorage.setItem(TOKENS, JSON.stringify(d));
    else localStorage.removeItem(TOKENS);
  } catch {}
}

// Pannello a muro. Il Pi apre la dashboard con #token=… in fondo all'indirizzo, scritto solo
// nel suo avvio automatico: la pagina lo conserva nel browser del Pi e lo toglie subito
// dall'indirizzo. Il frammento dopo # non arriva mai al server (nginx non lo vede né lo registra).
// Per revocarlo si cancella il token in HA.
const PANEL = 'ha-dashboard.token-pannello';

function panelToken(): string | null {
  const m = location.hash.match(/^#token=([\w.-]+)$/);
  if (m) history.replaceState(null, '', location.pathname + location.search);
  try {
    if (m) localStorage.setItem(PANEL, m[1]);
    return localStorage.getItem(PANEL);
  } catch {
    return m?.[1] ?? null;
  }
}

let auth: Auth | undefined;
let conn: Connection | undefined;

export async function start() {
  hass.status = 'connecting';
  hass.error = '';
  try {
    const token = panelToken();
    hass.panel = !!token;
    // Senza token salvati, getAuth porta alla pagina di login di HA e torna qui.
    auth = token
      ? createLongLivedTokenAuth(HA_URL, token)
      : await getAuth({ hassUrl: HA_URL, loadTokens: async () => loadTokens(), saveTokens, limitHassInstance: true });
    // Il ritorno dal login lascia ?auth_callback=1&code=… nell'indirizzo: si toglie.
    if (location.search.includes('auth_callback')) history.replaceState(null, '', location.pathname + location.hash);
    conn = await createConnection({ auth });
    const c = conn;
    hass.ws = (msg) => c.sendMessagePromise(msg);
    hass.watchHistory = (key) => watchHistory(c, key);
    await loadRegistries(conn);
    hass.user = (await getUser(conn)).name ?? '';
  } catch (err) {
    fail(err);
    return;
  }

  conn.addEventListener('disconnected', () => (hass.connected = false));
  conn.addEventListener('ready', (c) => {
    hass.connected = true;
    loadRegistries(c).catch(() => {});
  });
  conn.addEventListener('reconnect-error', (_c, err) => {
    if (err === ERR_INVALID_AUTH) fail(err);
  });

  subscribeEntities(conn, (entities) => {
    hass.states = entities;
    hass.status = 'ready';
  });

  // Stanze o dispositivi spostati in HA: si rileggono i registri (una volta sola per raffica).
  let t = 0;
  const reload = () => {
    clearTimeout(t);
    t = window.setTimeout(() => conn && loadRegistries(conn).catch(() => {}), 1000);
  };
  for (const ev of ['area_registry_updated', 'device_registry_updated', 'entity_registry_updated']) conn.subscribeEvents(reload, ev);
}

// Cronologia delle ultime 24 ore in streaming (history/stream): HA manda prima il passato,
// poi ogni cambiamento. Nessuna interrogazione periodica.
const DAY = 24 * 3600_000;
const streaming = new Set<string>();

function watchHistory(c: Connection, key: string) {
  const id = key.split(':')[0];
  if (streaming.has(id)) return;
  streaming.add(id);
  // Termostato: la temperatura misurata e quella desiderata sono attributi, non lo stato.
  const climate = id.startsWith('climate.');
  c.subscribeMessage<{ states?: Record<string, { s: string; a?: Record<string, any>; lu: number }[]> }>(
    (msg) => {
      const rows = msg.states?.[id];
      if (!rows?.length) return;
      if (climate) {
        merge(id, rows.map((r) => ({ t: r.lu * 1000, v: parseFloat(r.a?.current_temperature) })));
        merge(`${id}:target`, rows.map((r) => ({ t: r.lu * 1000, v: parseFloat(r.a?.temperature) })));
      } else {
        merge(id, rows.map((r) => ({ t: r.lu * 1000, v: parseFloat(r.s) })));
      }
    },
    {
      type: 'history/stream',
      entity_ids: [id],
      start_time: new Date(Date.now() - DAY).toISOString(),
      significant_changes_only: false,
      minimal_response: !climate,
      no_attributes: !climate,
    },
  ).catch((err) => {
    // Senza cronologia il grafico lo dice; si potrà riprovare riaprendo la pagina.
    streaming.delete(id);
    console.warn('Cronologia non disponibile per', id, err);
  });
}

/** Aggiunge i punti nuovi. Al massimo un punto al minuto: 24 ore di una presa che misura ogni
 *  pochi secondi sarebbero decine di migliaia di punti, troppi per il Pi del pannello. */
function merge(key: string, points: HistoryPoint[]) {
  const fresh = points.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
  if (!fresh.length) return;
  const old = hass.hist[key] ?? [];
  // Dopo una riconnessione HA rimanda tutto il periodo: in quel caso si riparte da capo.
  const all = old.length && fresh[0].t > old[old.length - 1].t ? [...old, ...fresh] : fresh;
  const cut = Date.now() - DAY;
  const out: HistoryPoint[] = [];
  for (const p of all) {
    if (p.t < cut && all.length > 1) continue;
    const last = out[out.length - 1];
    if (last && Math.floor(last.t / 60_000) === Math.floor(p.t / 60_000)) out[out.length - 1] = p;
    else out.push(p);
  }
  hass.hist[key] = out;
}

async function loadRegistries(c: Connection) {
  const [areas, devices, entities] = await Promise.all([
    c.sendMessagePromise<any[]>({ type: 'config/area_registry/list' }),
    c.sendMessagePromise<any[]>({ type: 'config/device_registry/list' }),
    c.sendMessagePromise<any[]>({ type: 'config/entity_registry/list' }),
  ]);
  // Si tengono solo i campi usati: i registri completi sono molto più grandi.
  hass.areas = areas.map((a) => ({ area_id: a.area_id, name: a.name, icon: a.icon ?? null }));
  hass.devices = devices.map((d) => ({ id: d.id, name: d.name_by_user ?? d.name ?? '', area_id: d.area_id ?? null }));
  hass.entityRegistry = entities.map((e) => ({
    entity_id: e.entity_id,
    area_id: e.area_id ?? null,
    device_id: e.device_id ?? null,
    disabled_by: e.disabled_by ?? null,
    hidden_by: e.hidden_by ?? null,
    entity_category: e.entity_category ?? null,
    platform: e.platform,
    translation_key: e.translation_key ?? null,
  }));
}

function fail(err: unknown) {
  hass.status = 'error';
  const here = location.origin;
  if (err === ERR_INVALID_AUTH && hass.panel) {
    forgetPanelToken();
    hass.error = 'Home Assistant non accetta più il token di questo pannello (cancellato o revocato). Serve crearne uno nuovo e metterlo nell\'avvio automatico del Pi.';
  } else if (err === ERR_INVALID_AUTH) {
    saveTokens(null);
    hass.error = "L'accesso è scaduto o è stato revocato in Home Assistant. Serve accedere di nuovo.";
  } else if (err === ERR_CANNOT_CONNECT) {
    hass.error = `Home Assistant non risponde su ${HA_URL}. Controlla che sia acceso e che questo dispositivo sia sulla rete di casa o sul tunnel WireGuard.`;
  } else if (err === ERR_INVALID_HTTPS_TO_HTTP) {
    hass.error = `Questa pagina è in https ma Home Assistant è in http (${HA_URL}): il browser blocca il collegamento. Apri la dashboard in http oppure metti HA in https.`;
  } else if (err === ERR_INVALID_AUTH_CALLBACK) {
    hass.error = 'Il ritorno dal login non corrisponde a questo Home Assistant. Riprova ad accedere.';
  } else if (err instanceof TypeError) {
    // fetch fallita verso /auth/token: di solito manca l'origine in cors_allowed_origins.
    hass.error = `Il login è andato a buon fine ma il browser non ha potuto ritirare l'accesso da Home Assistant. Di solito manca ${here} nella lista cors_allowed_origins di HA, oppure HA non è raggiungibile.`;
  } else {
    hass.error = `Errore imprevisto nel collegamento: ${String(err)}`;
  }
}

function forgetPanelToken() {
  try {
    localStorage.removeItem(PANEL);
  } catch {}
}

/** Esce da HA su questo dispositivo: revoca il token e torna al login. */
export async function logout() {
  try {
    await auth?.revoke();
  } catch {}
  saveTokens(null);
  location.replace(location.pathname);
}
