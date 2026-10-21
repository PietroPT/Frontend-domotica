// Regole di sicurezza prese dalla documentazione del Rack
// (AI/Rack/Documenti rack/piano-home-assistant.md, sezione prese SONOFF).
// Non sono preferenze grafiche: impediscono comandi che possono fare danni.
// Si riconoscono dal nome (entità, nome visibile o dispositivo) e non da un
// entity_id preciso: se in HA una presa viene rinominata, la regola resta.

import { hass } from './ha/hass.svelte';

export interface Policy {
  /** Nessun comando: si mostra solo la misura, con il motivo. */
  readOnly?: string;
  /** Si può spegnere ma non accendere da qui. */
  noRemoteOn?: string;
  /** Prima di spegnere si chiede conferma con questo avviso. */
  confirmOff?: string;
}

const rules: [RegExp, Policy][] = [
  [/rack/i, {
    readOnly: "La presa del rack non si comanda da qui: spegnerla toglie corrente a tutto il rack. Si gestisce solo da Zigbee2MQTT, dopo lo spegnimento ordinato dei nodi.",
  }],
  [/friggit/i, {
    noRemoteOn: 'Per sicurezza la friggitrice non si accende a distanza. Da qui si può solo spegnere.',
  }],
  [/feeding.?schedule/i, {
    confirmOff: 'Spegnendo il programma dei pasti il distributore smette di dare da mangiare al gatto agli orari stabiliti.',
  }],
  [/stampant|core.?one|prusa/i, {
    confirmOff: "Se la stampa è appena finita, aspetta che l'estrusore si raffreddi prima di togliere corrente alla Core One.",
  }],
];

export function policyOf(entity_id: string): Policy {
  const text = `${entity_id} ${hass.states[entity_id]?.attributes.friendly_name ?? ''} ${hass.deviceName(entity_id)}`;
  return rules.find(([re]) => re.test(text))?.[1] ?? {};
}
