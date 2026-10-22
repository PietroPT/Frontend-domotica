// Il servizio nel CT 203 (deploy/bollette.py, /api/...): bollette e disposizione della Casa.
// Ogni richiesta porta il token di HA con cui la dashboard è entrata.

import { hass } from './ha/hass.svelte';

export async function api(method: string, path: string, body?: unknown): Promise<any> {
  if (!hass.token) throw new Error('Home Assistant non è collegato');
  const res = await fetch(`./api/${path}`, {
    method,
    headers: { Authorization: `Bearer ${await hass.token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!data) throw new Error("l'archivio nel CT 203 non risponde (servizio non installato? va pubblicata la dashboard)");
  if (!res.ok) throw new Error(data.errore ?? `errore ${res.status}`);
  return data;
}
