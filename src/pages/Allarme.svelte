<script lang="ts">
  // Sezione Allarme: segnaposto, si configura in una fase successiva (richiesta di Pietro, 21/10).
  // Per ora mostra solo i sensori che HA ha già e che potranno farne parte.
  import { hass } from '../lib/ha/hass.svelte';
  import { ago } from '../lib/format';
  import { iconOf, nameOf } from '../lib/view';
  import Icon from '../lib/ui/Icon.svelte';

  const KINDS: Record<string, string> = { motion: 'Movimento', occupancy: 'Presenza', door: 'Porta', window: 'Finestra', opening: 'Apertura' };
  const sensors = $derived(
    hass.entities('binary_sensor')
      .filter((s) => s.attributes.device_class in KINDS && !hass.isBackground(s.entity_id))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
  );
  const panels = $derived(hass.entities('alarm_control_panel'));
</script>

<header class="top">
  <h1>Allarme</h1>
  <p class="sub">Da configurare</p>
</header>

<div class="layout">
  <section class="card intro">
    <span class="ic"><Icon name="allarme" size={30} /></span>
    <div>
      <h2>Non ancora attivo</h2>
      <p>Qui arriverà il pannello dell'allarme: inserito e disinserito, zone, sensori e avvisi. Lo configuriamo in una fase successiva.</p>
      {#if panels.length}<p class="note">In Home Assistant c'è già: {panels.map((p) => nameOf(p)).join(', ')}.</p>{/if}
    </div>
  </section>

  <section class="card">
    <h2>Sensori disponibili</h2>
    <p class="sub2">Movimento, presenza e aperture che Home Assistant conosce già</p>
    {#if sensors.length}
      <ul>
        {#each sensors as s (s.entity_id)}
          <li>
            <span class="ic small" class:on={s.state === 'on'}><Icon name={iconOf(s)} /></span>
            <span class="what"><b>{nameOf(s)}</b><small>{KINDS[s.attributes.device_class]} · {hass.areaName(hass.areaOf(s.entity_id))}</small></span>
            <span class="st">{s.state === 'on' ? 'Rilevato ora' : s.state === 'unavailable' ? 'Non raggiungibile' : ago(s.last_changed)}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="note">Nessun sensore di movimento o di apertura in Home Assistant.</p>
    {/if}
  </section>
</div>

<style>
  .top { margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 8px; }
  .layout { display: grid; gap: 16px; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  .intro { display: flex; gap: 14px; align-items: flex-start; }
  .intro p { color: var(--ink-2); font-size: 15px; line-height: 1.45; margin-top: 4px; }
  .ic { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--sicurezza); color: #fff; flex: none; }
  .ic :global(.d) { fill-opacity: 0.32; }
  .ic.small { width: 44px; height: 44px; background: var(--track); color: var(--ink-2); }
  .ic.small.on { background: var(--sicurezza); color: #fff; }
  .note { font-size: 13.5px; color: var(--ink-2); margin-top: 8px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; }
  li + li { border-top: 1px solid var(--sep); }
  .what { min-width: 0; }
  .what b { display: block; font-weight: 600; font-size: 15px; }
  .what small { display: block; font-size: 13px; color: var(--ink-2); }
  .st { font-size: 13.5px; color: var(--ink-2); text-align: right; }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: 1fr 1fr; align-items: start; } }
</style>
