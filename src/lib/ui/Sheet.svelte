<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let { title, subtitle, onclose, children, wide = false }:
    { title: string; subtitle?: string; onclose: () => void; children: Snippet; wide?: boolean } = $props();

  let panel: HTMLElement;
  $effect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onclose(); };
    addEventListener('keydown', key);
    return () => { removeEventListener('keydown', key); prev?.focus?.(); };
  });
</script>

<div class="scrim" onclick={onclose} aria-hidden="true"></div>
<div class="sheet" class:wide role="dialog" aria-modal="true" aria-label={title} tabindex="-1" bind:this={panel}>
  <div class="grab" aria-hidden="true"></div>
  <header>
    <div>
      <h2>{title}</h2>
      {#if subtitle}<p>{subtitle}</p>{/if}
    </div>
    <button class="x" onclick={onclose} aria-label="Chiudi"><Icon name="chiudi" size={20} /></button>
  </header>
  <div class="content">{@render children()}</div>
</div>

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 40;
    background: var(--scrim);
    animation: fade 0.3s var(--ease);
  }
  .sheet {
    position: fixed; z-index: 41;
    left: 0; right: 0; bottom: 0;
    max-height: 92vh; overflow: auto;
    background: var(--raised);
    color: var(--ink);
    border-radius: 28px 28px 0 0;
    padding: 8px 20px calc(24px + env(safe-area-inset-bottom));
    box-shadow: var(--shadow-lift);
    animation: rise 0.5s var(--ease);
    outline: none;
  }
  .grab { width: 40px; height: 5px; border-radius: 3px; background: var(--track); margin: 0 auto 10px; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; }
  header p { color: var(--ink-2); font-size: 14.5px; margin-top: 2px; }
  .x { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--track); display: grid; place-items: center; cursor: pointer; color: var(--ink-2); flex: none; }

  @media (min-width: 720px) {
    .sheet {
      left: 50%; right: auto; bottom: auto; top: 50%;
      width: min(480px, calc(100vw - 48px));
      transform: translate(-50%, -50%);
      border-radius: 28px;
      padding: 22px 24px 26px;
      animation: pop 0.45s var(--ease);
    }
    .sheet.wide { width: min(880px, calc(100vw - 48px)); }
    .grab { display: none; }
  }

  @keyframes fade { from { opacity: 0; } }
  @keyframes rise { from { transform: translateY(40%); opacity: 0; } }
  @keyframes pop { from { transform: translate(-50%, -46%) scale(0.97); opacity: 0; } }
</style>
