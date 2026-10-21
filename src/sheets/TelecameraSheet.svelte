<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { ago } from '../lib/format';
  import Sheet from '../lib/ui/Sheet.svelte';
  import CameraView from '../lib/ui/CameraView.svelte';

  let { id }: { id: string } = $props();
  const c = $derived(hass.states[id]);
  const m = $derived(hass.states[id.replace('camera.', 'binary_sensor.') + '_motion']);
  const portrait = $derived(c?.attributes.orientation === 'portrait');
</script>

{#if c}
  <Sheet wide title={c.attributes.friendly_name} subtitle={m ? (m.state === 'on' ? 'Movimento in corso' : `Ultimo movimento ${ago(m.last_changed)}`) : 'Frigate'} onclose={() => app.close()}>
    <div class="v" class:portrait>
      <CameraView big name={c.attributes.friendly_name} {portrait} motion={m?.state === 'on'} />
    </div>
    <p class="note">Nel mockup l'immagine è disegnata. Dalla fase 2 arriva il video vero, attraverso Home Assistant (anche dal tunnel WireGuard).</p>
  </Sheet>
{/if}

<style>
  .v.portrait { width: min(100%, 52vh); margin: 0 auto; }
  .note { font-size: 13px; color: var(--ink-2); margin-top: 12px; }
</style>
