<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { ago } from '../lib/format';
  import { cameraSrc, isPortrait, motionOf } from '../lib/view';
  import CameraView from '../lib/ui/CameraView.svelte';

  const cams = $derived(hass.entities('camera'));
</script>

<header class="top">
  <h1>Telecamere</h1>
  <p class="sub">Frigate · {cams.length} telecamere. La Cell 3C «Ingresso» resta nell'app Imou.</p>
</header>

<div class="grid">
  {#each cams as c (c.entity_id)}
    {@const m = motionOf(c.entity_id)}
    <button class="cam" class:portrait={isPortrait(c)} onclick={() => app.open({ kind: 'telecamera', id: c.entity_id })} aria-label="Apri {c.attributes.friendly_name} a schermo intero">
      <CameraView name={c.attributes.friendly_name} portrait={isPortrait(c)} motion={m?.state === 'on'}
        src={cameraSrc(c)} refresh={10} onshape={(p) => (hass.portrait[c.entity_id] = p)} />
      <span class="meta">{m?.state === 'on' ? 'Movimento in corso' : m ? `Ultimo movimento ${ago(m.last_changed)}` : ''}</span>
    </button>
  {/each}
</div>

<style>
  .top { margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  .grid { display: grid; grid-template-columns: 3fr 4fr; gap: 12px; align-items: start; }
  .grid > * { min-width: 0; }
  .cam { border: 0; padding: 0; background: none; text-align: left; cursor: pointer; display: grid; gap: 8px; }
  .meta { font-size: 13.5px; color: var(--ink-2); padding-left: 4px; }
  @media (max-width: 560px) {
    .grid { grid-template-columns: 1fr; }
    .cam :global(.cam.portrait) { aspect-ratio: 4 / 3; }
  }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
</style>
