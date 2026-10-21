<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { tileOf } from '../lib/view';
  import Tile from '../lib/ui/Tile.svelte';
  import Icon from '../lib/ui/Icon.svelte';

  const lights = $derived(hass.entities('light'));
  const on = $derived(lights.filter((l) => l.state === 'on'));
  const groups = $derived(
    [...hass.areas.map((a) => a.area_id), null]
      .map((area) => ({ area, tiles: lights.filter((l) => hass.areaOf(l.entity_id) === area).map((l) => tileOf(l.entity_id)!) }))
      .filter((g) => g.tiles.length),
  );
</script>

<header class="top">
  <div>
    <h1>Luci</h1>
    <p class="sub">{on.length ? `${on.length} accese su ${lights.length}` : `Tutte spente · ${lights.length} luci`}</p>
  </div>
  <button class="pill" disabled={!on.length} onclick={() => hass.callService('light', 'turn_off', { entity_id: on.map((l) => l.entity_id) })}>
    <Icon name="power" size={20} />Spegni tutte
  </button>
</header>

<div class="groups">
  {#each groups as g (g.area)}
    <section>
      <h2>{hass.areaName(g.area)}</h2>
      <div class="grid">
        {#each g.tiles as t (t.id)}
          <Tile icon={t.icon} title={t.title} detail={t.detail} on={t.on} color={t.color} ontoggle={t.toggle} onopen={t.open} />
        {/each}
      </div>
    </section>
  {/each}
  <button class="add" onclick={() => app.open({ kind: 'aggiungi' })}>
    <span><Icon name="aggiungi" size={26} /></span>
    <span><b>Aggiungi una luce</b><small>Abbinala in Zigbee2MQTT, assegnale una stanza in Home Assistant: comparirà qui da sola.</small></span>
  </button>
</div>

<style>
  .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  .pill { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px 0 12px; border: 0; border-radius: 22px; background: var(--tile); font-weight: 600; cursor: pointer; }
  .pill:disabled { opacity: 0.45; cursor: default; }
  .groups { display: grid; gap: 22px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .add { display: flex; gap: 14px; align-items: center; text-align: left; padding: 14px 16px; border-radius: var(--r-tile); border: 1.5px dashed var(--track); background: none; cursor: pointer; }
  .add > span:first-child { width: 48px; height: 48px; border-radius: 50%; background: var(--tile); display: grid; place-items: center; color: var(--luci); flex: none; }
  .add b { display: block; font-weight: 600; }
  .add small { display: block; color: var(--ink-2); font-size: 13.5px; margin-top: 2px; }
  @media (min-width: 720px) { .grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); } h1 { font-size: 40px; } }
</style>
