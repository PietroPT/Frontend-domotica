<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import Sheet from '../lib/ui/Sheet.svelte';
  import BrightnessSlider from '../lib/ui/BrightnessSlider.svelte';
  import Icon from '../lib/ui/Icon.svelte';

  let { id }: { id: string } = $props();
  const e = $derived(hass.states[id]);
  const on = $derived(e?.state === 'on');
  const pct = $derived(Math.round(((e?.attributes.brightness ?? 0) / 255) * 100));
  const ct = $derived(e?.attributes.supported_color_modes?.includes('color_temp'));
  const dimmable = $derived(e?.attributes.supported_color_modes?.some((m: string) => m !== 'onoff'));
  const temps = [[2700, 'Calda', '#ffb35c'], [4000, 'Neutra', '#ffe2b8'], [5500, 'Fredda', '#dce9ff']] as const;

  const set = (v: number) =>
    v === 0 ? hass.callService('light', 'turn_off', { entity_id: id }) : hass.callService('light', 'turn_on', { entity_id: id, brightness_pct: v });
</script>

{#if e}
  <Sheet renameId={id} title={e.attributes.friendly_name ?? id} subtitle="{hass.areaName(hass.areaOf(id))} · {on ? 'Accesa' : 'Spenta'}" onclose={() => app.close()}>
    <div class="body">
      {#if dimmable}<BrightnessSlider value={pct} off={!on} onchange={set} label="Luminosità {e.attributes.friendly_name}" />{/if}
      {#if ct}
        <div class="temps" role="radiogroup" aria-label="Colore della luce">
          {#each temps as [k, label, sw]}
            {@const sel = on && Math.abs((e.attributes.color_temp_kelvin ?? 0) - k) < 500}
            <button role="radio" aria-checked={sel} class:sel onclick={() => hass.callService('light', 'turn_on', { entity_id: id, color_temp_kelvin: k })}>
              <span style:background={sw}></span>{label}
            </button>
          {/each}
        </div>
      {/if}
      <button class="power" class:on onclick={() => hass.callService('light', on ? 'turn_off' : 'turn_on', { entity_id: id })}>
        <Icon name="power" size={22} />{on ? 'Spegni' : 'Accendi'}
      </button>
    </div>
  </Sheet>
{/if}

<style>
  .body { display: grid; justify-items: center; gap: 20px; }
  .temps { display: flex; gap: 10px; }
  .temps button { display: grid; justify-items: center; gap: 6px; border: 0; background: none; font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer; padding: 4px; min-width: 64px; }
  .temps span { width: 44px; height: 44px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--sep); }
  .temps .sel { color: var(--ink); }
  .temps .sel span { box-shadow: 0 0 0 3px var(--raised), 0 0 0 5px var(--luci); }
  .power { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 56px; border: 0; border-radius: 18px; background: var(--track); font-weight: 600; font-size: 16px; cursor: pointer; }
  .power.on { background: color-mix(in srgb, var(--luci) 18%, var(--raised)); }
</style>
