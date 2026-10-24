import type { HassEntity } from './ha/types';

// Alias espliciti dei due avvisi registrazione e dei due avvisi persona.
// Gli entity_id si leggono da HA: nessun filtro generico su tutte le automazioni.
const CAMERAS = ['Soggiorno', 'Ufficio'] as const;
const ALERTS = [
  { suffix: 'registrazione ferma', label: 'Registrazioni' },
  { suffix: 'persona rilevata', label: 'Persone' },
] as const;
const normalize = (name: unknown) => typeof name === 'string'
  ? name.trim().toLocaleLowerCase('it').replace(/[–—]/g, '-').replace(/\s+/g, ' ')
  : '';

export function cameraNotifications(entities: HassEntity[]) {
  const rows = CAMERAS.flatMap((camera) => ALERTS.map((alert) => {
    const alias = `Frigate - ${camera} ${alert.suffix}`;
    const matches = entities.filter((entity) => entity.entity_id.startsWith('automation.')
      && normalize(entity.attributes.friendly_name) === normalize(alias));
    const entity = matches.length === 1 ? matches[0] : undefined;
    const state = matches.length > 1 ? 'ambiguous' : !entity ? 'missing'
      : entity.state === 'on' || entity.state === 'off' ? entity.state : 'unavailable';
    return { camera, label: alert.label, alias, entity, state };
  }));
  const ready = rows.every((row) => row.state === 'on' || row.state === 'off');
  const state = !ready ? 'unavailable' : rows.every((row) => row.state === 'on') ? 'on'
    : rows.every((row) => row.state === 'off') ? 'off' : 'mixed';
  return { rows, ready, state };
}

export function cameraNotificationCommand(entities: HassEntity[], enabled: boolean) {
  const group = cameraNotifications(entities);
  if (!group.ready) return null;
  return {
    domain: 'automation',
    service: enabled ? 'turn_on' : 'turn_off',
    data: {
      entity_id: group.rows.map((row) => row.entity!.entity_id),
      // Cancella anche l'attesa di rientro di un avviso già inviato.
      ...(enabled ? {} : { stop_actions: true }),
    },
  };
}
