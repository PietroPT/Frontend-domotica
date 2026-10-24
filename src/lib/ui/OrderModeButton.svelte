<script lang="ts">
  import Icon from './Icon.svelte';
  let { editing, disabled = false, label = "Cambia l'ordine dei riquadri", onchange }:
    { editing: boolean; disabled?: boolean; label?: string; onchange: (editing: boolean) => void } = $props();
</script>

{#if editing}
  <button class="pill ok" {disabled} onclick={() => onchange(false)}>Fine</button>
{:else}
  <button class="round" {disabled} onclick={() => onchange(true)} aria-label={label}><Icon name="matita" size={20} /></button>
{/if}

<style>
  .round { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tile); display: grid; place-items: center; cursor: pointer; color: var(--ink); }
  .pill { min-height: 44px; padding: 0 20px; border-radius: 22px; border: 0; font-weight: 600; font-size: 15px; cursor: pointer; }
  .pill.ok { background: var(--energia); color: #fff; }
  button:disabled { opacity: .5; cursor: default; }
</style>
