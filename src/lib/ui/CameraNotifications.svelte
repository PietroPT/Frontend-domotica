<script lang="ts">
  import { onDestroy } from 'svelte';
  import { hass } from '../ha/hass.svelte';
  import { cameraNotifications, cameraNotificationCommand } from '../camera-notifications';
  import Icon from './Icon.svelte';
  import { ordered } from '../security-layout';
  import OrderControls from './OrderControls.svelte';

  let { title = 'Notifiche telecamere', rowOrder = [], rowNames = {}, editing = false, editDisabled = false, onOpenTitle, onOpenRow, onMoveRow }:
    { title?: string; rowOrder?: string[]; rowNames?: Record<string, string>; editing?: boolean; editDisabled?: boolean; onOpenTitle?: () => void; onOpenRow?: (id: string) => void; onMoveRow?: (index: number, direction: number) => void } = $props();

  const group = $derived(cameraNotifications(hass.entities('automation')));
  let pending = $state(false);
  let failed = $state(false);
  let confirmKey = $state<string | null>(null);
  let confirmTimer = 0;
  const online = $derived(hass.connected && hass.status === 'ready');
  const bindingKey = $derived(group.rows.map((row) => row.entity?.entity_id ?? '').join('|'));
  function clearConfirmation() {
    clearTimeout(confirmTimer);
    confirmKey = null;
  }
  onDestroy(clearConfirmation);
  $effect(() => {
    if (confirmKey && (editing || !online || !group.ready || confirmKey !== bindingKey)) clearConfirmation();
  });
  const labels: Record<string, string> = {
    on: 'Attive', off: 'In pausa', mixed: 'Parzialmente attive', unavailable: 'Da verificare',
  };
  const rowLabels: Record<string, string> = {
    on: 'Attive', off: 'In pausa', missing: 'Non collegata', ambiguous: 'Nome duplicato', unavailable: 'Non disponibile',
  };

  async function setNotifications(enabled: boolean) {
    if (pending || !online || editing) return;
    // Rileggi i destinatari al clic, anche se nel frattempo HA è cambiato.
    const command = cameraNotificationCommand(hass.entities('automation'), enabled);
    if (!command) return;
    // Come in Avanzate, la disattivazione richiede un secondo tocco entro 4 s.
    if (!enabled && confirmKey !== bindingKey) {
      confirmKey = bindingKey;
      clearTimeout(confirmTimer);
      confirmTimer = window.setTimeout(clearConfirmation, 4000);
      return;
    }
    clearConfirmation();
    pending = true;
    failed = false;
    try {
      failed = !await hass.callService(command.domain, command.service, command.data);
    } finally {
      pending = false;
    }
    // Nessun aggiornamento ottimistico: lo stato arriva dalla sottoscrizione HA.
  }
</script>

<section class="notifications" aria-labelledby="notifications-title" aria-busy={pending}>
  <div class="heading">
    <span class="disc" class:active={online && group.state === 'on'}><Icon name="notifica" size={28} /></span>
    <div>
      <h2 id="notifications-title">{#if onOpenTitle && !editing}<button class="name" onclick={onOpenTitle} aria-label="Apri {title}">{title}</button>{:else}{title}{/if}</h2>
      <p class="status" role="status">{!online ? 'Home Assistant non collegato' : pending ? 'Aggiornamento…' : labels[group.state]}</p>
    </div>
  </div>
  <p class="description">Persone rilevate e avvisi di registrazione interrotta o ripristinata per Soggiorno e Ufficio.</p>
  <div class="rooms">
    {#each ordered(group.rows, rowOrder, (r) => r.alias) as row, index (row.alias)}
      {@const name = rowNames[row.alias]?.trim() || `${row.camera} · ${row.label}`}
      <div class:ordering={editing}><span>{#if onOpenRow && !editing}<button class="name" onclick={() => onOpenRow?.(row.alias)} aria-label="Apri {name}">{name}</button>{:else}{name}{/if}</span><b>{online ? rowLabels[row.state] : 'Stato non aggiornato'}</b>
        {#if editing}<OrderControls {name} first={index === 0} last={index === group.rows.length - 1} disabled={editDisabled} onmove={d => onMoveRow?.(index, d)} />{/if}
      </div>
    {/each}
  </div>
  <div class="actions">
    <button class="primary" disabled={editing || !online || !group.ready || pending}
      onclick={() => setNotifications(group.state !== 'on')}>
      {group.state === 'on' ? confirmKey ? 'Conferma sospensione' : 'Sospendi notifiche' : 'Attiva notifiche'}
    </button>
    {#if group.state === 'mixed'}
      <button disabled={editing || !online || pending} onclick={() => setNotifications(false)}>{confirmKey ? 'Conferma sospensione' : 'Sospendi tutte'}</button>
    {/if}
  </div>
  {#if confirmKey}<p class="note" role="status">Tocca di nuovo entro 4 secondi per sospendere gli avvisi.</p>{/if}
  <p class="note">Le telecamere continuano a registrare. Gli altri avvisi di casa restano attivi.</p>
  {#if !group.ready && online}
    <p class="warning">Non riesco a collegare tutti gli avvisi. Controlla in Home Assistant le automazioni “Frigate - Soggiorno registrazione ferma”, “Frigate - Ufficio registrazione ferma”, “Frigate - Soggiorno persona rilevata” e “Frigate - Ufficio persona rilevata”.</p>
  {/if}
  {#if failed}<p class="warning" role="alert">Comando non riuscito. Lo stato mostrato è quello ricevuto da Home Assistant.</p>{/if}
</section>

<style>
  .notifications { background: var(--tile); border-radius: var(--r-card); padding: 22px; }
  .heading { display: flex; align-items: center; gap: 14px; }
  .disc { display: grid; place-items: center; flex: none; width: 52px; height: 52px; border-radius: 50%; background: var(--track); color: var(--ink-2); }
  .disc.active { background: var(--sicurezza); color: #fff; }
  .disc :global(.d) { fill-opacity: .32; }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; overflow-wrap: anywhere; }
  .status { color: var(--ink-2); font-size: 15px; margin-top: 4px; }
  .description { font-size: 15px; color: var(--ink-2); line-height: 1.45; margin: 20px 0 8px; }
  .rooms > div { position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 16px; padding: 12px 0; min-height: 48px; font-size: 15px; }
  .rooms .ordering { outline: 2px dashed var(--sep); outline-offset: -2px; border-radius: var(--r-tile); }
  .rooms > div + div { border-top: 1px solid var(--sep); }
  .rooms b { font-weight: 600; }
  .rooms span { overflow-wrap: anywhere; min-width: 0; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  .actions button { min-height: 56px; border: 0; border-radius: 18px; padding: 12px 18px; flex: 1 1 180px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 15px; }
  .name { min-height: 44px; border: 0; background: none; color: inherit; padding: 0; font: inherit; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
  button.primary { background: var(--energia); color: #fff; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .note, .warning { font-size: 13.5px; line-height: 1.45; margin-top: 14px; color: var(--ink-2); }
  .warning { color: var(--ink); padding: 12px; background: var(--track); border-radius: 12px; overflow-wrap: anywhere; }
</style>
