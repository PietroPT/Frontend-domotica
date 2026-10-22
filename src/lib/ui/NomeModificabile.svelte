<script lang="ts">
  // Nome di un'entità che si cambia toccandolo. Il nome si salva in Home Assistant
  // (registro delle entità), quindi vale ovunque: dashboard, app di HA, altri dispositivi.
  // L'entity_id non cambia, quindi automazioni e regole di sicurezza restano agganciate.
  // Con save e hint rinomina altro (es. una stanza) con lo stesso aspetto.
  import { hass } from '../ha/hass.svelte';
  import Icon from './Icon.svelte';

  let {
    id, name, small = false,
    save: store = (v: string) => hass.rename(id, v),
    hint = 'Il nome cambia anche in Home Assistant. Lascia vuoto per tornare al nome originale.',
  }: { id: string; name: string; small?: boolean; save?: (name: string) => Promise<void>; hint?: string } = $props();

  let editing = $state(false);
  let value = $state('');
  let busy = $state(false);
  let error = $state('');
  let input = $state<HTMLInputElement>();

  function start() {
    value = name;
    error = '';
    editing = true;
  }
  $effect(() => { if (editing) input?.select(); });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    error = '';
    try {
      await store(value);
      editing = false;
    } catch (err: any) {
      error = err?.code === 'unauthorized'
        ? 'Solo un amministratore di Home Assistant può rinominare.'
        : `Nome non salvato: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

{#if editing}
  <form class="edit" class:small onsubmit={save}>
    <input bind:this={input} bind:value maxlength="60" aria-label="Nuovo nome per {name}"
      onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); editing = false; } }} />
    <div class="row">
      <button type="button" onclick={() => (editing = false)}>Annulla</button>
      <button type="submit" class="ok" disabled={busy}>{busy ? 'Salvo…' : 'Salva'}</button>
    </div>
    <p class="hint" class:err={!!error} role={error ? 'alert' : undefined}>
      {error || hint}
    </p>
  </form>
{:else}
  <button class="name" class:small onclick={start} aria-label="Rinomina {name}">
    <span>{name}</span><Icon name="matita" size={small ? 16 : 18} />
  </button>
{/if}

<style>
  .name {
    display: inline-flex; align-items: center; gap: 8px; max-width: 100%;
    border: 0; background: none; padding: 0; margin: 0; cursor: pointer; text-align: left; color: var(--ink);
    font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15;
  }
  .name span { min-width: 0; overflow-wrap: anywhere; }
  .name :global(svg) { color: var(--ink-3); }
  .name.small { font-size: 15px; font-weight: 600; letter-spacing: 0; }
  .edit { display: grid; gap: 8px; width: 100%; }
  input {
    width: 100%; min-height: 48px; padding: 0 14px; border-radius: 14px; border: 2px solid var(--energia);
    background: var(--tile); color: var(--ink); font: inherit; font-size: 18px; font-weight: 600;
  }
  .edit.small input { font-size: 16px; min-height: 44px; }
  input:focus { outline: none; }
  .row { display: flex; gap: 8px; }
  .row button { flex: 1; min-height: 44px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 15px; cursor: pointer; }
  .row .ok { background: var(--energia); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .hint { font-size: 13px; color: var(--ink-2); line-height: 1.4; }
  .hint.err { color: var(--pericolo); font-weight: 600; }
</style>
