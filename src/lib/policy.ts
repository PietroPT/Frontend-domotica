// Regole di sicurezza prese dalla documentazione del Rack
// (AI/Rack/Documenti rack/piano-home-assistant.md, sezione prese SONOFF).
// Non sono preferenze grafiche: impediscono comandi che possono fare danni.

export interface Policy {
  /** Nessun comando: si mostra solo la misura, con il motivo. */
  readOnly?: string;
  /** Si può spegnere ma non accendere da qui. */
  noRemoteOn?: string;
  /** Prima di spegnere si chiede conferma con questo avviso. */
  confirmOff?: string;
}

export const policies: Record<string, Policy> = {
  'switch.presa_rack': {
    readOnly: "La presa del rack non si comanda da qui: spegnerla toglie corrente a tutto il rack. Si gestisce solo da Zigbee2MQTT, dopo lo spegnimento ordinato dei nodi.",
  },
  'sensor.presa_rack_power': {
    readOnly: "La presa del rack non si comanda da qui: spegnerla toglie corrente a tutto il rack.",
  },
  'switch.presa_friggitrice': {
    noRemoteOn: 'Per sicurezza la friggitrice non si accende a distanza. Da qui si può solo spegnere.',
  },
  'switch.presa_stampante3d': {
    confirmOff: "Se la stampa è appena finita, aspetta che l'estrusore si raffreddi prima di togliere corrente alla Core One.",
  },
};

export const policyOf = (entity_id: string): Policy => policies[entity_id] ?? {};
