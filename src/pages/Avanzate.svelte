<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app, type Theme } from '../lib/app.svelte';
  import { ago, duration, watt, since } from '../lib/format';
  import { iconOf } from '../lib/view';
  import Icon from '../lib/ui/Icon.svelte';
  import type { IconName } from '../lib/icons';

  const n = (id: string) => hass.num(id);
  const st = (id: string) => hass.states[id]?.state;
  const charge = $derived(n('sensor.ups_battery_charge'));
  const online = $derived(st('sensor.ups_status_data')?.startsWith('OL'));
  const autos = $derived(hass.entities('automation'));
  const printing = $derived(st('sensor.core_one') === 'printing');

  const services: { icon: IconName; name: string; ok: boolean; detail: string }[] = $derived([
    { icon: 'ha', name: 'Home Assistant', ok: hass.connected, detail: hass.connected ? 'Collegato · dati in tempo reale' : 'Non raggiungibile' },
    { icon: 'zigbee', name: 'Zigbee2MQTT', ok: st('binary_sensor.zigbee2mqtt_bridge_connection_state') === 'on', detail: `Coordinatore collegato ${since(hass.states['binary_sensor.zigbee2mqtt_bridge_connection_state']?.last_changed ?? '')}` },
    { icon: 'stampante3d', name: 'Stampante 3D', ok: true, detail: printing ? `In stampa · ${st('sensor.core_one_progress')}% · ${st('sensor.core_one_filename')}` : 'Inattiva' },
    { icon: 'crocchette', name: 'Crocchette', ok: st('sensor.crocchette_livello') === 'Normale', detail: `Livello ${st('sensor.crocchette_livello')?.toLowerCase()}` },
  ]);
  const themes: [Theme, string][] = [['auto', 'Automatico'], ['chiaro', 'Chiaro'], ['scuro', 'Scuro']];
</script>

<header class="top">
  <div>
    <h1>Avanzate</h1>
    <p class="sub">Rack, servizi e automazioni</p>
  </div>
  <button class="pill" onclick={() => app.go('casa')}><Icon name="lucchetto" size={20} />Blocca</button>
</header>

<div class="layout">
  <section class="card ups">
    <div class="head">
      <span class="ic" style:background={online ? 'var(--rack)' : 'var(--pericolo)'}><Icon name="ups" /></span>
      <div><h2>UPS</h2><p class="sub2">{online ? 'Alimentato dalla rete' : 'A batteria'} · {st('sensor.ups_status')}</p></div>
    </div>
    <div class="gauge" role="meter" aria-label="Carica batterie UPS" aria-valuenow={charge} aria-valuemin="0" aria-valuemax="100">
      <i style:width="{charge}%"></i><span class="num">{charge}%</span>
    </div>
    <dl class="rows">
      <div><dt>Carico</dt><dd class="num">{n('sensor.ups_load')}%</dd></div>
      <div><dt>Autonomia stimata</dt><dd class="num">{duration(n('sensor.ups_battery_runtime'))}</dd></div>
      <div><dt>Tensione ingresso</dt><dd class="num">{n('sensor.ups_input_voltage')} V</dd></div>
    </dl>
    <p class="note">Sola lettura: NUT senza credenziali. L'autonomia è la stima dell'UPS, ottimista.</p>
  </section>

  <section class="card">
    <div class="head">
      <span class="ic" style:background="var(--rack)"><Icon name="rack" /></span>
      <div><h2>Rack</h2><p class="sub2">Presa protetta · si comanda solo da Zigbee2MQTT</p></div>
    </div>
    <dl class="rows">
      <div><dt>Potenza</dt><dd class="num">{watt(n('sensor.presa_rack_power'))}</dd></div>
      <div><dt>Tensione</dt><dd class="num">{n('sensor.presa_rack_voltage')} V</dd></div>
      <div><dt>Totale</dt><dd class="num">{Math.round(n('sensor.presa_rack_energy'))} kWh</dd></div>
    </dl>
  </section>

  <section class="card">
    <h2>Servizi</h2>
    <ul class="list">
      {#each services as s}
        <li>
          <span class="ic small"><Icon name={s.icon} /></span>
          <span class="what"><b>{s.name}</b><small>{s.detail}</small></span>
          <span class="state" class:bad={!s.ok}><i></i>{s.ok ? 'Ok' : 'Guasto'}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section class="card">
    <h2>Automazioni</h2>
    <ul class="list">
      {#each autos as a (a.entity_id)}
        <li>
          <span class="ic small" class:on={a.state === 'on'}><Icon name={iconOf(a)} /></span>
          <span class="what"><b>{a.attributes.friendly_name}</b><small>Ultima esecuzione {a.attributes.last_triggered ? ago(a.attributes.last_triggered) : 'mai'}</small></span>
          <button class="sw" class:on={a.state === 'on'} role="switch" aria-checked={a.state === 'on'} aria-label="{a.attributes.friendly_name}: {a.state === 'on' ? 'attiva' : 'disattivata'}"
            onclick={() => hass.callService('automation', a.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: a.entity_id })}></button>
        </li>
      {/each}
    </ul>
    <p class="note">Le automazioni si scrivono in Home Assistant; qui si attivano e disattivano.</p>
  </section>

  <section class="card">
    <h2>Aspetto</h2>
    <div class="seg" role="radiogroup" aria-label="Tema">
      {#each themes as [t, label]}
        <button role="radio" aria-checked={app.theme === t} class:sel={app.theme === t} onclick={() => app.setTheme(t)}>{label}</button>
      {/each}
    </div>
    <p class="note">Automatico segue il telefono o il computer; sul pannello a muro passa allo scuro la sera.</p>
  </section>
</div>

<style>
  .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  .pill { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px 0 12px; border: 0; border-radius: 22px; background: var(--tile); font-weight: 600; cursor: pointer; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .sub2 { color: var(--ink-2); font-size: 14px; }
  .layout { display: grid; gap: 16px; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  .head { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
  .ic { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; color: #fff; flex: none; }
  .ic :global(.d) { fill-opacity: 0.32; }
  .ic.small { width: 44px; height: 44px; background: var(--track); color: var(--ink-2); }
  .ic.small.on { background: var(--rack); color: #fff; }
  .gauge { position: relative; height: 40px; border-radius: 12px; background: var(--track); overflow: hidden; }
  .gauge i { position: absolute; inset: 0 auto 0 0; background: var(--ok); border-radius: 12px; }
  .gauge span { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
  .rows { margin: 12px 0 0; }
  .rows div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 11px 0; border-top: 1px solid var(--sep); }
  .rows div:first-child { border-top: 0; }
  .rows dt { font-size: 15px; color: var(--ink-2); }
  .rows dd { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
  .note { font-size: 13px; color: var(--ink-2); margin-top: 12px; }
  .list { list-style: none; margin: 10px 0 0; padding: 0; }
  .list li { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; }
  .list li + li { border-top: 1px solid var(--sep); }
  .what b { display: block; font-weight: 600; font-size: 15px; }
  .what small { display: block; font-size: 13px; color: var(--ink-2); }
  .state { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; color: var(--ok); }
  .state i { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
  .state.bad { color: var(--pericolo); }
  .sw { width: 56px; height: 34px; border-radius: 17px; border: 0; background: var(--track); position: relative; cursor: pointer; transition: background-color 0.3s var(--ease); }
  .sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 28px; height: 28px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: transform 0.3s var(--ease); }
  .sw.on { background: var(--ok); }
  .sw.on::after { transform: translateX(22px); }
  .seg { display: flex; background: var(--track); border-radius: 14px; padding: 4px; margin-top: 12px; }
  .seg button { flex: 1; min-height: 44px; border: 0; border-radius: 10px; background: none; font-weight: 600; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: 1fr 1fr; align-items: start; } }
</style>
