<script lang="ts">
  import { app, type Page } from './lib/app.svelte';
  import Icon from './lib/ui/Icon.svelte';
  import type { IconName } from './lib/icons';
  import Casa from './pages/Casa.svelte';
  import Luci from './pages/Luci.svelte';
  import Clima from './pages/Clima.svelte';
  import Energia from './pages/Energia.svelte';
  import Telecamere from './pages/Telecamere.svelte';
  import Avanzate from './pages/Avanzate.svelte';
  import LuceSheet from './sheets/LuceSheet.svelte';
  import PresaSheet from './sheets/PresaSheet.svelte';
  import TelecameraSheet from './sheets/TelecameraSheet.svelte';
  import AggiungiSheet from './sheets/AggiungiSheet.svelte';

  const tabs: [Page, string, IconName][] = [
    ['casa', 'Casa', 'casa'], ['luci', 'Luci', 'luce'], ['clima', 'Clima', 'termostato'],
    ['energia', 'Energia', 'energia'], ['telecamere', 'Telecamere', 'telecamera'],
  ];

  // Tema: automatico segue il sistema; chiaro e scuro lo forzano.
  const dark = matchMedia('(prefers-color-scheme: dark)');
  let systemDark = $state(dark.matches);
  dark.addEventListener('change', (e) => (systemDark = e.matches));
  $effect(() => {
    const scuro = app.theme === 'scuro' || (app.theme === 'auto' && systemDark);
    document.documentElement.dataset.theme = scuro ? 'scuro' : 'chiaro';
  });

  // Avanzate senza sblocco (es. indirizzo digitato a mano) torna alla Casa.
  $effect(() => { if (app.page === 'avanzate' && !app.unlocked) app.go('casa'); });
  $effect(() => { app.page; scrollTo({ top: 0 }); });
</script>

<div class="shell">
  <nav class="tabs" aria-label="Sezioni">
    {#each tabs as [page, label, icon]}
      <a href="#/{page}" class:on={app.page === page} aria-current={app.page === page ? 'page' : undefined}>
        <Icon name={icon} size={26} /><span>{label}</span>
      </a>
    {/each}
    {#if app.unlocked}
      <a href="#/avanzate" class="adv" class:on={app.page === 'avanzate'} aria-current={app.page === 'avanzate' ? 'page' : undefined}>
        <Icon name="avanzate" size={26} /><span>Avanzate</span>
      </a>
    {/if}
  </nav>

  <main>
    {#if app.page === 'casa'}<Casa />
    {:else if app.page === 'luci'}<Luci />
    {:else if app.page === 'clima'}<Clima />
    {:else if app.page === 'energia'}<Energia />
    {:else if app.page === 'telecamere'}<Telecamere />
    {:else if app.page === 'avanzate'}<Avanzate />{/if}
  </main>
</div>

{#if app.sheet?.kind === 'luce'}<LuceSheet id={app.sheet.id} />
{:else if app.sheet?.kind === 'presa'}<PresaSheet id={app.sheet.id} />
{:else if app.sheet?.kind === 'telecamera'}<TelecameraSheet id={app.sheet.id} />
{:else if app.sheet?.kind === 'aggiungi'}<AggiungiSheet />{/if}

<style>
  .shell { min-height: 100vh; }
  main { padding: calc(14px + env(safe-area-inset-top)) 16px calc(104px + env(safe-area-inset-bottom)); max-width: 1440px; margin: 0 auto; }

  .tabs {
    position: fixed; z-index: 30; left: 0; right: 0; bottom: 0;
    display: flex; justify-content: space-around;
    padding: 6px 4px calc(8px + env(safe-area-inset-bottom));
    background: var(--chrome);
    -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px);
    border-top: 1px solid var(--sep);
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .tabs { background: var(--raised); }
  }
  .tabs a {
    flex: 1; display: grid; justify-items: center; gap: 2px; padding: 6px 0; min-height: 56px;
    color: var(--ink-3); text-decoration: none; font-size: 11.5px; font-weight: 600;
    transition: color 0.25s var(--ease);
  }
  .tabs a.on { color: var(--energia); }
  .tabs a.on :global(.d) { fill-opacity: 0.3; }
  .tabs a.adv.on { color: var(--rack); }

  @media (min-width: 720px) {
    .shell { display: grid; grid-template-columns: 96px 1fr; }
    .tabs {
      position: sticky; top: 0; height: 100vh; flex-direction: column; justify-content: flex-start; gap: 6px;
      padding: 24px 8px; border-top: 0; border-right: 1px solid var(--sep);
    }
    .tabs a { flex: none; min-height: 72px; align-content: center; border-radius: 18px; font-size: 12.5px; }
    .tabs a.on { background: var(--tile); }
    main { padding: 28px 32px 40px; width: 100%; }
  }
</style>
