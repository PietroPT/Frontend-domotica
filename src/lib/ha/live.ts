// Collegamento vero a Home Assistant con home-assistant-js-websocket.
// Accesso: il login di HA (OAuth, getAuth). Nel codice non c'è nessun token:
// HA rilascia i token dopo il login e restano solo nel browser di questo dispositivo.
// Dati: stati in tempo reale (subscribeEntities) e registri di aree, dispositivi
// ed entità, riletti quando cambiano in HA. Nessuna interrogazione periodica.

import {
  createConnection,
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

let auth: Auth | undefined;
let conn: Connection | undefined;

export async function start() {
  hass.status = 'connecting';
  hass.error = '';
  try {
    // Senza token salvati, getAuth porta alla pagina di login di HA e torna qui.
    auth = await getAuth({ hassUrl: HA_URL, loadTokens: async () => loadTokens(), saveTokens, limitHassInstance: true });
    // Il ritorno dal login lascia ?auth_callback=1&code=… nell'indirizzo: si toglie.
    if (location.search.includes('auth_callback')) history.replaceState(null, '', location.pathname + location.hash);
    conn = await createConnection({ auth });
    const c = conn;
    hass.ws = (msg) => c.sendMessagePromise(msg);
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
  if (err === ERR_INVALID_AUTH) {
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

/** Esce da HA su questo dispositivo: revoca il token e torna al login. */
export async function logout() {
  try {
    await auth?.revoke();
  } catch {}
  saveTokens(null);
  location.replace(location.pathname);
}
