<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from '../icons';

  let {
    icon, title, detail, on = false, color = 'var(--luci)', locked = false,
    ontoggle, onopen, toggleLabel,
  }: {
    icon: IconName; title: string; detail: string; on?: boolean; color?: string; locked?: boolean;
    ontoggle?: () => void; onopen?: () => void; toggleLabel?: string;
  } = $props();
</script>

<div class="tile" class:on style:--c={color} style:--ci={color === 'var(--luci)' ? 'var(--on-luci)' : '#fff'}>
  {#if ontoggle}
    <button class="dot" onclick={ontoggle} aria-pressed={on} aria-label={toggleLabel ?? `${on ? 'Spegni' : 'Accendi'} ${title}`}>
      <Icon name={icon} />
    </button>
  {:else}
    <span class="dot" aria-hidden="true"><Icon name={icon} /></span>
  {/if}
  <button class="body" onclick={onopen} disabled={!onopen} aria-label={onopen ? `Apri ${title}` : undefined}>
    <span class="t">{title}</span>
    <span class="d num">
      {#if locked}<span class="lock"><Icon name="lucchetto" size={13} /></span>{/if}<span class="dt">{detail}</span>
    </span>
  </button>
</div>

<style>
  .tile {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 72px;
    min-width: 0;
    padding: 10px 6px 10px 10px;
    border-radius: var(--r-tile);
    background: var(--tile);
    transition: background-color 0.35s var(--ease), box-shadow 0.35s var(--ease), transform 0.2s var(--ease);
  }
  .tile:has(.body:active), .tile:has(.dot:active) { transform: scale(0.975); }
  .tile.on { background: var(--tile-on); box-shadow: var(--shadow); color: var(--tile-on-ink); }

  .dot {
    width: 48px; height: 48px; flex: none;
    border-radius: 50%;
    display: grid; place-items: center;
    border: 0; padding: 0;
    background: var(--track);
    color: var(--ink-2);
    cursor: pointer;
    transition: background-color 0.35s var(--ease), color 0.35s var(--ease);
  }
  span.dot { cursor: default; }
  .on .dot { background: var(--c); color: var(--ci); }
  .on .dot :global(.d) { fill-opacity: 0.32; }

  .body {
    flex: 1; min-width: 0; align-self: stretch;
    display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
    background: none; border: 0; padding: 0 4px; text-align: left; cursor: pointer;
    color: inherit;
  }
  .body:disabled { cursor: default; }
  .t { font-weight: 600; font-size: 15px; line-height: 1.2; letter-spacing: -0.01em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; max-width: 100%; }
  .d { font-size: 13.5px; color: var(--ink-2); display: flex; align-items: center; gap: 4px; max-width: 100%; }
  .dt { min-width: 0; }
  .on .d { color: var(--tile-on-ink-2); }
  .lock { display: inline-flex; color: var(--ink-3); }

  @media (min-width: 1100px) {
    .tile { gap: 8px; padding-left: 8px; }
    .dot { width: 44px; height: 44px; }
    /* quattro colonne: dettaglio su una riga sola */
    .dt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
  /* pannello a muro: riquadri più alti, si toccano e si leggono da lontano */
  @media (pointer: coarse) and (min-width: 1100px) {
    .tile { min-height: 84px; }
    .t { font-size: 16px; }
  }
  @media (hover: hover) {
    .tile:not(.on):hover { background: var(--tile-hover); }
  }
</style>
