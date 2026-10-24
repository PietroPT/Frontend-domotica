<script lang="ts">
  import Icon from './Icon.svelte';
  let { name, first, last, disabled = false, overlay = true, onmove }:
    { name: string; first: boolean; last: boolean; disabled?: boolean; overlay?: boolean; onmove: (direction: number) => void } = $props();
</script>

<div class="move" class:overlay>
  <button disabled={first || disabled} onclick={() => onmove(-1)} aria-label="Sposta {name} prima"><Icon name="frecciasx" size={20} /></button>
  <button disabled={last || disabled} onclick={() => onmove(1)} aria-label="Sposta {name} dopo"><Icon name="freccia" size={20} /></button>
</div>

<style>
  .move { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }
  .overlay { position: absolute; inset: 0; border-radius: var(--r-tile); background: color-mix(in srgb, var(--tile) 45%, transparent); }
  button { width: 40px; height: 40px; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--raised); color: var(--ink); box-shadow: var(--shadow); cursor: pointer; }
  button:disabled { visibility: hidden; }
</style>
