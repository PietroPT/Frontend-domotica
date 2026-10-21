// Strutture di Home Assistant come arrivano dalla API WebSocket.
// HassEntity ricalca il tipo di `home-assistant-js-websocket`; i registri
// ricalcano le risposte di config/area_registry/list, config/entity_registry/list
// e config/device_registry/list. Nella fase 2 la sorgente finta viene sostituita
// dalla connessione vera senza toccare le pagine.

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface AreaEntry {
  area_id: string;
  name: string;
  icon: string | null;
}

export interface EntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  disabled_by: string | null;
  hidden_by: string | null;
}

export interface DeviceRegistryEntry {
  id: string;
  name: string;
  area_id: string | null;
}

/** Un punto della cronologia (history/stream o recorder/statistics). */
export interface HistoryPoint {
  t: number; // epoch ms
  v: number;
}
