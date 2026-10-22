<script lang="ts">
  // «+ Nuova stanza»: crea un'area in Home Assistant. oncreated riceve l'id della stanza nuova.
  import { hass } from '../ha/hass.svelte';
  import Icon from './Icon.svelte';

  let { oncreated, label = 'Crea' }: { oncreated?: (area_id: string) => Promise<void> | void; label?: string } = $props();

  let open = $state(false);
  let value = $state('');
  let busy = $state(false);
  let error = $state('');
  let input = $state<HTMLInputElement>();
  $effect(() => { if (open) input?.focus(); });

  async function create(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    error = '';
    try {
      const id = await hass.createArea(value);
      await oncreated?.(id);
      value = '';
      open = false;
    } catch (err: any) {
      error = err?.code === 'unauthorized'
        ? 'Solo un amministratore di Home Assistant può creare stanze.'
        : `Stanza non creata: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

{#if open}
  <form class="new" onsubmit={create}>
    <input bind:this={input} bind:value maxlength="40" placeholder="Nome della stanza" aria-label="Nome della stanza nuova"
      onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); open = false; } }} />
    <div class="row">
      <button type="button" onclick={() => (open = false)}>Annulla</button>
      <button type="submit" class="ok" disabled={busy || !value.trim()}>{busy ? 'Creo…' : label}</button>
    </div>
    {#if error}<p class="err" role="alert">{error}</p>{/if}
  </form>
{:else}
  <button class="add" onclick={() => { error = ''; open = true; }}><Icon name="piu" size={18} />Nuova stanza</button>
{/if}

<style>
  .add {
    display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px 0 10px; justify-self: start;
    border: 1.5px dashed var(--ink-3); border-radius: 22px; background: none; color: var(--ink); font-weight: 600; font-size: 15px; cursor: pointer;
  }
  .new { display: grid; gap: 8px; width: 100%; }
  input {
    width: 100%; min-height: 48px; padding: 0 14px; border-radius: 14px; border: 2px solid var(--energia);
    background: var(--tile); color: var(--ink); font: inherit; font-size: 17px; font-weight: 600;
  }
  input:focus { outline: none; }
  .row { display: flex; gap: 8px; }
  .row button { flex: 1; min-height: 44px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 15px; cursor: pointer; }
  .row .ok { background: var(--energia); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .err { font-size: 13px; color: var(--pericolo); font-weight: 600; line-height: 1.4; }
</style>
