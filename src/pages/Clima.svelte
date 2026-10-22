<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { temp, since } from '../lib/format';
  import ThermostatDial from '../lib/ui/ThermostatDial.svelte';
  import LineChart from '../lib/ui/LineChart.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import { thermostat } from '../lib/view';
  import NomeModificabile from '../lib/ui/NomeModificabile.svelte';
  import StanzaModificabile from '../lib/ui/StanzaModificabile.svelte';

  const t = $derived(thermostat());
  const id = $derived(t?.entity_id ?? '');
  const a = $derived(t?.attributes ?? {});
  const step = $derived(a.target_temp_step ?? 0.5);
  const set = (v: number) => hass.callService('climate', 'set_temperature', { entity_id: id, temperature: Math.min(30, Math.max(a.min_temp ?? 5, v)) });
  const mode = (m: string) => hass.callService('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: m });
</script>

<header class="top">
  <h1>Clima</h1>
  <p class="sub">{hass.areaName(hass.areaOf(id))} · Termostato</p>
</header>

{#if t}
  <div class="layout">
    <section class="card dial">
      <ThermostatDial size={320} target={a.temperature} current={a.current_temperature} min={a.min_temp} max={30} {step}
        mode={t.state} action={a.hvac_action} onchange={set} />
      <div class="steps">
        <button onclick={() => set(a.temperature - step)} disabled={t.state === 'off'} aria-label="Abbassa di {step}°"><Icon name="meno" /></button>
        <div class="seg" role="radiogroup" aria-label="Modalità">
          <button role="radio" aria-checked={t.state === 'heat'} class:sel={t.state === 'heat'} onclick={() => mode('heat')}><Icon name="fiamma" size={20} />Riscalda</button>
          <button role="radio" aria-checked={t.state === 'off'} class:sel={t.state === 'off'} onclick={() => mode('off')}><Icon name="power" size={20} />Spento</button>
        </div>
        <button onclick={() => set(a.temperature + step)} disabled={t.state === 'off'} aria-label="Alza di {step}°"><Icon name="piu" /></button>
      </div>
    </section>

    <section class="card">
      <h2>Ultime 24 ore</h2>
      <p class="legend"><span class="sw"></span>Temperatura misurata <span class="sw dash"></span>Desiderata</p>
      <LineChart label="Temperatura nelle ultime 24 ore" series={hass.history(id)} dashed={hass.history(id + ':target')}
        color="var(--clima)" format={(v) => temp(v, 0)} />
      <dl>
        <div><dt>Nome</dt><dd><NomeModificabile small {id} name={t.attributes.friendly_name ?? id} /></dd></div>
        <div><dt>Programmazione</dt><dd>Manuale (impostazioni di fabbrica)</dd></div>
        <div><dt>Ultimo cambio di stato</dt><dd>{since(t.last_changed)}</dd></div>
        <div><dt>Collegamento</dt><dd>Zigbee2MQTT · MOES ZHT-S03</dd></div>
      </dl>
      <div class="room"><StanzaModificabile {id} /></div>
    </section>
  </div>
{/if}

<style>
  .top { margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .layout { display: grid; gap: 16px; }
  .layout > * { min-width: 0; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  .dial { display: grid; justify-items: center; gap: 14px; }
  .steps { display: flex; align-items: center; gap: 8px; max-width: 100%; }
  .steps > button { width: 52px; height: 52px; flex: none; border-radius: 50%; border: 0; background: var(--track); display: grid; place-items: center; cursor: pointer; }
  .steps > button:disabled { opacity: 0.4; cursor: default; }
  .seg { display: flex; background: var(--track); border-radius: 16px; padding: 4px; }
  .seg button { display: flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 11px; border: 0; border-radius: 12px; background: none; font-weight: 600; font-size: 15px; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  .legend { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-2); margin: 4px 0 12px; flex-wrap: wrap; }
  .sw { width: 18px; height: 3px; border-radius: 2px; background: var(--clima); display: inline-block; margin-left: 6px; }
  .sw:first-child { margin-left: 0; }
  .sw.dash { background: repeating-linear-gradient(90deg, var(--ink-3) 0 5px, transparent 5px 9px); }
  dl { margin: 18px 0 0; display: grid; gap: 0; }
  dl div { display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid var(--sep); font-size: 14.5px; }
  dt { color: var(--ink-2); }
  .room { margin-top: 6px; }
  dd { margin: 0; font-weight: 500; text-align: right; }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: minmax(380px, 1fr) 1.2fr; align-items: start; } }
</style>
