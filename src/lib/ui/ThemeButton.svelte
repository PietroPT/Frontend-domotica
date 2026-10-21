<script lang="ts">
  import { app, type Theme } from '../app.svelte';
  import Icon from './Icon.svelte';
  const next: Record<Theme, Theme> = { auto: 'chiaro', chiaro: 'scuro', scuro: 'auto' };
  const icon = { auto: 'automatico', chiaro: 'sole', scuro: 'luna' } as const;
  const label = { auto: 'automatico', chiaro: 'chiaro', scuro: 'scuro' };
</script>

<button onclick={() => app.setTheme(next[app.theme])} aria-label="Tema {label[app.theme]}: tocca per cambiare" title="Tema {label[app.theme]}">
  <Icon name={icon[app.theme]} size={22} />
</button>

<style>
  button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tile); display: grid; place-items: center; cursor: pointer; color: var(--ink); }
</style>
