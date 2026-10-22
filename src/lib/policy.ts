// Regole di sicurezza prese dalla documentazione del Rack
// (AI/Rack/Documenti rack/piano-home-assistant.md, sezione prese SONOFF).
// Non sono preferenze grafiche: impediscono comandi che possono fare danni.
// Si riconoscono dal nome (entità, nome visibile o dispositivo) e non da un
// entity_id preciso: se in HA una presa viene rinominata, la regola resta.

import { hass } from './ha/hass.svelte';

export interface Policy {
  /** Nessun comando: si mostra solo la misura, con il motivo. */
  readOnly?: string;
  /** Prima di accendere si chiede conferma con questo avviso. */
  confirmOn?: string;
  /** Prima di spegnere si chiede conferma con questo avviso. */
  confirmOff?: string;
}

const rules: [RegExp, Policy][] = [
  [/rack/i, {
    readOnly: "La presa del rack non si comanda da qui: spegnerla toglie corrente a tutto il rack. Si gestisce solo da Zigbee2MQTT, dopo lo spegnimento ordinato dei nodi.",
  }],
  // Fino al 22/10 non si accendeva a distanza; da allora sì, ma solo dopo l'avviso (decisione di Pietro).
  [/friggit/i, {
    confirmOn: "Accendere la presa dà corrente alla friggitrice: secondo il modello può partire subito a scaldare. Prima controlla che il cestello sia inserito e che sopra e intorno non ci sia niente appoggiato.",
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
