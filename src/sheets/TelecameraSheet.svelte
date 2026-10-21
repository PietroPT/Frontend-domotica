<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { ago } from '../lib/format';
  import Sheet from '../lib/ui/Sheet.svelte';
  import { cameraSrc, isPortrait, motionOf } from '../lib/view';
  import CameraView from '../lib/ui/CameraView.svelte';

  let { id }: { id: string } = $props();
  const c = $derived(hass.states[id]);
  const m = $derived(motionOf(id));
  const portrait = $derived(c ? isPortrait(c) : false);
</script>

{#if c}
  <Sheet wide title={c.attributes.friendly_name} subtitle={m ? (m.state === 'on' ? 'Movimento in corso' : `Ultimo movimento ${ago(m.last_changed)}`) : 'Frigate'} onclose={() => app.close()}>
    <div class="v" class:portrait>
      <CameraView big name={c.attributes.friendly_name} {portrait} motion={m?.state === 'on'} src={cameraSrc(c, true)}
        onshape={(p) => (hass.portrait[id] = p)} />
    </div>
    {#if hass.demo}
      <p class="note">Nel mockup l'immagine è disegnata: con Home Assistant collegato arriva il video vero.</p>
    {:else}
      <p class="note">Video continuo attraverso Home Assistant, senza audio. Funziona anche dal tunnel WireGuard.</p>
    {/if}
  </Sheet>
{/if}

<style>
  .v.portrait { width: min(100%, 52vh); margin: 0 auto; }
  .note { font-size: 13px; color: var(--ink-2); margin-top: 12px; }
</style>
