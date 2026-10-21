<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { layout } from '../lib/layout.svelte';
  import { tileOf } from '../lib/view';
  import { kw, temp, today, clock } from '../lib/format';
  import Tile from '../lib/ui/Tile.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import CameraView from '../lib/ui/CameraView.svelte';
  import ThermostatDial from '../lib/ui/ThermostatDial.svelte';
  import SlideToUnlock from '../lib/ui/SlideToUnlock.svelte';
  import ThemeButton from '../lib/ui/ThemeButton.svelte';

  let now = $state(new Date());
  $effect(() => { const i = setInterval(() => (now = new Date()), 30_000); return () => clearInterval(i); });

  const term = $derived(hass.states['climate.termostato']);
  const lightsOn = $derived(hass.entities('light').filter((l) => l.state === 'on').length);
  const totalW = $derived(Object.values(hass.states).filter((s) => s.attributes.device_class === 'power').reduce((a, s) => a + (+s.state || 0), 0));
  const motion = $derived(hass.entities('binary_sensor').filter((s) => s.attributes.device_class === 'motion' && s.state === 'on'));

  // Riquadri della Casa raggruppati per stanza, nell'ordine delle aree di HA.
  const rooms = $derived(
    [...hass.areas.map((a) => a.area_id), null]
      .map((area) => ({
        area,
        tiles: layout.pinned.filter((id) => !id.startsWith('camera.') && hass.areaOf(id) === area).map(tileOf).filter((t) => t !== null),
      }))
      .filter((r) => r.tiles.length),
  );
  function summary(area: string | null): string {
    const ids = Object.keys(hass.states).filter((id) => hass.areaOf(id) === area);
    const on = ids.filter((id) => id.startsWith('light.') && hass.states[id].state === 'on').length;
    const clim = ids.find((id) => id.startsWith('climate.'));
    const parts = [];
    if (clim) parts.push(temp(hass.states[clim].attributes.current_temperature));
    parts.push(on ? (on === 1 ? '1 luce accesa' : `${on} luci accese`) : 'Luci spente');
    return parts.join(' · ');
  }
  const cams = $derived(layout.pinned.filter((id) => id.startsWith('camera.') && hass.states[id]));
</script>

<div class="casa">
  <header class="top">
    <div>
      <h1>Casa</h1>
      <p class="when">{today(now)} · <span class="num">{clock(now)}</span></p>
    </div>
    <div class="actions">
      <ThemeButton />
      <button class="round" onclick={() => app.open({ kind: 'aggiungi' })} aria-label="Aggiungi alla Casa"><Icon name="piu" size={22} /></button>
    </div>
  </header>

  {#if hass.demo}<p class="demo">Mockup con dati di esempio: nessun collegamento a Home Assistant.</p>{/if}

  <nav class="chips" aria-label="Riepilogo">
    <button class="chip" onclick={() => app.go('clima')}>
      <span class="c" style:background="var(--clima)"><Icon name="termometro" size={18} /></span>
      <span><b>Clima</b><small class="num">{temp(term?.attributes.current_temperature)} → {temp(term?.attributes.temperature)}</small></span>
    </button>
    <button class="chip" onclick={() => app.go('luci')}>
      <span class="c" style:background="var(--luci)"><Icon name="luce" size={18} /></span>
      <span><b>Luci</b><small>{lightsOn ? `${lightsOn} accese` : 'Tutte spente'}</small></span>
    </button>
    <button class="chip" onclick={() => app.go('energia')}>
      <span class="c" style:background="var(--energia)"><Icon name="energia" size={18} /></span>
      <span><b>Energia</b><small class="num">{kw(totalW)}</small></span>
    </button>
    <button class="chip" onclick={() => app.go('telecamere')}>
      <span class="c" style:background="var(--sicurezza)"><Icon name="telecamera" size={18} /></span>
      <span><b>Sicurezza</b><small>{motion.length ? `Movimento: ${motion.map((m) => hass.areaName(hass.areaOf(m.entity_id))).join(', ')}` : 'Tranquillo'}</small></span>
    </button>
  </nav>

  <div class="cols">
    <div class="rooms">
      {#each rooms as r (r.area)}
        <section>
          <div class="rh"><h2>{hass.areaName(r.area)}</h2><span class="num">{summary(r.area)}</span></div>
          <div class="grid">
            {#each r.tiles as t (t.id)}
              <Tile icon={t.icon} title={t.title} detail={t.detail} on={t.on} color={t.color} locked={t.locked}
                ontoggle={t.toggle} onopen={t.open} />
            {/each}
          </div>
        </section>
      {/each}
    </div>

    <aside class="side">
      {#if term}
        <section class="clima card">
          <h2>Clima</h2>
          <ThermostatDial size={250} target={term.attributes.temperature} current={term.attributes.current_temperature}
            min={term.attributes.min_temp} max={30} step={term.attributes.target_temp_step}
            mode={term.state} action={term.attributes.hvac_action}
            onchange={(t) => hass.callService('climate', 'set_temperature', { entity_id: term.entity_id, temperature: t })} />
        </section>
      {/if}
      {#if cams.length}
        <section>
          <h2>Telecamere</h2>
          <div class="cams">
            {#each cams as id (id)}
              <button class="cambtn" onclick={() => app.open({ kind: 'telecamera', id })} aria-label="Apri {hass.states[id].attributes.friendly_name}">
                <CameraView name={hass.states[id].attributes.friendly_name} portrait={hass.states[id].attributes.orientation === 'portrait'}
                  motion={hass.states[id.replace('camera.', 'binary_sensor.') + '_motion']?.state === 'on'} />
              </button>
            {/each}
          </div>
        </section>
      {/if}
      <SlideToUnlock onunlock={() => app.unlock()} />
    </aside>
  </div>
</div>

<style>
  .casa { display: grid; gap: 18px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .when { color: var(--ink-2); font-size: 15px; margin-top: 4px; }
  .actions { display: flex; gap: 8px; }
  .round { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tile); display: grid; place-items: center; cursor: pointer; color: var(--ink); }
  .demo { font-size: 13px; color: var(--ink-2); background: var(--tile); border-radius: 12px; padding: 8px 12px; justify-self: start; }

  .chips { display: flex; gap: 8px; overflow-x: auto; margin: 0 -16px; padding: 2px 16px 4px; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chip {
    flex: none; display: flex; align-items: center; gap: 9px; min-height: 52px;
    padding: 6px 16px 6px 7px; border-radius: 16px; border: 0; background: var(--tile); cursor: pointer; text-align: left;
  }
  .chip .c { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
  .chip b { display: block; font-size: 14px; font-weight: 600; line-height: 1.2; }
  .chip small { display: block; font-size: 12.5px; color: var(--ink-2); white-space: nowrap; }

  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 10px; }
  .rooms { display: grid; gap: 22px; }
  .rh { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .rh h2 { margin: 0; }
  .rh span { font-size: 14px; color: var(--ink-2); }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }

  .side { display: grid; gap: 22px; align-content: start; }
  .clima { display: none; }
  .cams { display: flex; gap: 10px; container-type: inline-size; }
  /* altezza comune: una verticale (3:4) e una orizzontale (4:3) riempiono la riga */
  .cambtn { border: 0; padding: 0; background: none; cursor: pointer; border-radius: var(--r-tile); height: calc((100cqw - 10px) / 2.0834); display: block; }
  .cambtn :global(.cam) { height: 100%; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 16px 18px 18px; display: grid; justify-items: center; }
  .card h2 { justify-self: start; }

  .cols { display: grid; gap: 22px; }
  .cols > * { min-width: 0; }

  @media (min-width: 720px) {
    .grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
    .chips { margin: 0; padding: 2px 0 4px; }
    h1 { font-size: 40px; }
  }
  @media (min-width: 1100px) {
    .cols { grid-template-columns: minmax(0, 1fr) 320px; align-items: start; gap: 28px; }
    .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .side { position: sticky; top: 24px; }
    .clima { display: grid; }
  }
</style>
