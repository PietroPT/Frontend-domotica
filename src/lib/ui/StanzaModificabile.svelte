<script lang="ts">
  // Stanza di un dispositivo: si tocca e si sceglie fra le aree di Home Assistant, o se ne crea una nuova.
  // Si salva in HA e sposta il dispositivo intero. Chi non è amministratore la vede soltanto.
  import { hass } from '../ha/hass.svelte';
  import Icon from './Icon.svelte';
  import NuovaStanza from './NuovaStanza.svelte';

  let { id }: { id: string } = $props();

  const current = $derived(hass.areaOf(id));
  let open = $state(false);
  let busy = $state(false);
  let error = $state('');

  async function move(area_id: string | null) {
    if (busy) return;
    if (area_id === current) { open = false; return; }
    busy = true;
    error = '';
    try {
      await hass.setArea(id, area_id);
      open = false;
    } catch (err: any) {
      error = err?.code === 'unauthorized'
        ? 'Solo un amministratore di Home Assistant può cambiare la stanza.'
        : `Stanza non cambiata: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

{#if !hass.admin}
  <div class="row"><Icon name="casa" size={20} /><span class="lab">Stanza</span><b>{hass.areaName(current)}</b></div>
{:else if !open}
  <button class="row" onclick={() => { error = ''; open = true; }} aria-label="Cambia stanza, ora {hass.areaName(current)}">
    <Icon name="casa" size={20} /><span class="lab">Stanza</span><b>{hass.areaName(current)}</b><Icon name="frecciagiu" size={18} />
  </button>
{:else}
  <div class="pick" aria-busy={busy}>
    <div class="head">
      <p>In quale stanza?</p>
      <button class="x" onclick={() => (open = false)} aria-label="Chiudi la scelta della stanza"><Icon name="chiudi" size={18} /></button>
    </div>
    <div class="chips" role="group" aria-label="Stanze">
      {#each hass.areas as a (a.area_id)}
        <button class:sel={a.area_id === current} aria-pressed={a.area_id === current} disabled={busy} onclick={() => move(a.area_id)}>{a.name}</button>
      {/each}
      <button class:sel={current === null} aria-pressed={current === null} disabled={busy} onclick={() => move(null)}>Senza stanza</button>
    </div>
    <NuovaStanza label="Crea e sposta qui" oncreated={move} />
    <p class="hint" class:err={!!error} role={error ? 'alert' : undefined}>
      {error || 'Si sposta tutto il dispositivo (per una presa anche la sua misura di potenza). La stanza cambia anche in Home Assistant.'}
    </p>
  </div>
{/if}

<style>
  .row {
    display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 0 14px;
    border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-size: 15px; text-align: left;
  }
  button.row { cursor: pointer; }
  .row :global(svg) { color: var(--ink-2); flex: none; }
  .lab { color: var(--ink-2); }
  .row b { margin-left: auto; font-weight: 600; min-width: 0; overflow-wrap: anywhere; text-align: right; }
  .pick { display: grid; gap: 10px; padding: 12px 14px 14px; border-radius: 14px; background: var(--track); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .head p { font-weight: 600; font-size: 15px; }
  .x { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--raised); display: grid; place-items: center; cursor: pointer; color: var(--ink-2); flex: none; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips button {
    min-height: 44px; padding: 0 16px; border: 0; border-radius: 22px; background: var(--raised); color: var(--ink);
    font-weight: 600; font-size: 15px; cursor: pointer;
  }
  .chips button.sel { background: var(--energia); color: #fff; }
  .chips button:disabled { opacity: 0.6; cursor: default; }
  .hint { font-size: 13px; color: var(--ink-2); line-height: 1.4; }
  .hint.err { color: var(--pericolo); font-weight: 600; }
</style>
