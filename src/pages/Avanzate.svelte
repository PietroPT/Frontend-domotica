<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app, type Theme } from '../lib/app.svelte';
  import { ago, duration, watt, since } from '../lib/format';
  import { iconOf } from '../lib/view';
  import { logout } from '../lib/ha/live';
  import type { HassEntity } from '../lib/ha/types';
  import Icon from '../lib/ui/Icon.svelte';
  import type { IconName } from '../lib/icons';

  const n = (id: string) => hass.num(id);
  const st = (id: string) => hass.states[id]?.state;
  const find = (re: RegExp) => Object.keys(hass.states).find((id) => re.test(id));

  // UPS (NUT) e stampante (PrusaLink): riconosciuti dall'integrazione e dal nome interno della misura,
  // che non cambia rinominando le entità. Nel mockup (registro senza integrazione) si usa il nome dell'entity_id.
  const nut = (key: string, suffix: string) => (hass.demo ? find(new RegExp(`^sensor\\.ups_${suffix}$`)) : hass.byKey('nut', key));
  const upsIds = $derived({
    charge: nut('battery_charge', 'battery_charge'),
    status: nut('ups_status', 'status_data'),
    display: nut('ups_status_display', 'status'),
    load: nut('ups_load', 'load'),
    runtime: nut('battery_runtime', 'battery_runtime'),
    voltage: nut('input_voltage', 'input_voltage'),
  });
  const ups = $derived(upsIds.charge ?? upsIds.status ?? upsIds.display);
  const charge = $derived(upsIds.charge ? n(upsIds.charge) : NaN);
  const online = $derived(
    upsIds.status ? st(upsIds.status)?.startsWith('OL') : /online|rete/i.test(st(upsIds.display ?? '') ?? ''),
  );

  // Rack: la presa è disattivata in HA, resta il sensore di potenza (e i suoi fratelli sullo stesso dispositivo).
  const rack = $derived(Object.values(hass.states).find((s) => s.attributes.device_class === 'power' && /rack/i.test(`${s.entity_id} ${hass.deviceName(s.entity_id)}`)));
  const rackOf = (dc: string) => (rack ? hass.sibling(rack.entity_id, (s) => s.attributes.device_class === dc) : undefined);

  const autos = $derived(hass.entities('automation'));
  // Disattivare un'automazione (es. il riavvio di Zigbee2MQTT) richiede un secondo tocco entro 4 secondi:
  // un tocco per sbaglio non deve spegnere una protezione. Riattivarla è immediato.
  let confirmOff = $state<string | null>(null);
  let confirmTimer = 0;
  function toggleAuto(a: HassEntity) {
    if (a.state !== 'on') return hass.callService('automation', 'turn_on', { entity_id: a.entity_id });
    if (confirmOff !== a.entity_id) {
      confirmOff = a.entity_id;
      clearTimeout(confirmTimer);
      confirmTimer = window.setTimeout(() => (confirmOff = null), 4000);
      return;
    }
    confirmOff = null;
    return hass.callService('automation', 'turn_off', { entity_id: a.entity_id });
  }
  const printer = $derived(hass.demo ? find(/^sensor\.core_one$/) : hass.byKey('prusalink', 'printer_state'));
  const printerOf = (key: string, suffix: string) => (hass.demo ? `${printer}${suffix}` : hass.byKey('prusalink', key) ?? '');
  const bridge = 'binary_sensor.zigbee2mqtt_bridge_connection_state';
  // Distributore PetKit (integrazione non ufficiale): entity_id letti dall'HA di casa il 21/10.
  // «Livello cibo» è un allarme: off = cibo sufficiente, on = in esaurimento.
  const kibble = 'binary_sensor.crocchette_livello_cibo';
  const kibbleErr = $derived(st('sensor.crocchette_errore'));
  const kibbleOk = $derived(st(kibble) === 'off' && (!kibbleErr || kibbleErr === 'No error'));
  const kibbleDetail = $derived(
    [
      kibbleErr && kibbleErr !== 'No error' ? `Errore: ${kibbleErr}` : st(kibble) === 'on' ? 'Cibo in esaurimento' : st(kibble) === 'off' ? 'Cibo sufficiente' : 'Non raggiungibile',
      hass.states['sensor.crocchette_totale_erogato'] ? `oggi ${st('sensor.crocchette_totale_erogato')} g` : '',
      hass.states['sensor.crocchette_giorni_rimanenti_essicante'] ? `essiccante tra ${st('sensor.crocchette_giorni_rimanenti_essicante')} g` : '',
    ].filter(Boolean).join(' · '),
  );

  // Solo i servizi che esistono in HA: un sensore mancante non diventa un «Guasto».
  const services: { icon: IconName; name: string; ok: boolean; detail: string }[] = $derived([
    { icon: 'ha', name: 'Home Assistant', ok: hass.connected, detail: hass.connected ? 'Collegato · dati in tempo reale' : 'Non raggiungibile, riprovo' },
    ...(hass.states[bridge] ? [{ icon: 'zigbee' as IconName, name: 'Zigbee2MQTT', ok: st(bridge) === 'on', detail: st(bridge) === 'on' ? `Coordinatore collegato ${since(hass.states[bridge].last_changed)}` : `Coordinatore scollegato ${since(hass.states[bridge].last_changed)}` }] : []),
    ...(printer ? [{ icon: 'stampante3d' as IconName, name: 'Stampante 3D', ok: st(printer) !== 'unavailable', detail: st(printer) === 'printing' ? `In stampa · ${st(printerOf('progress', '_progress'))}% · ${st(printerOf('filename', '_filename'))}` : st(printer) === 'unavailable' ? 'Spenta o non raggiungibile' : 'Inattiva' }] : []),
    ...(hass.states[kibble] ? [{ icon: 'crocchette' as IconName, name: 'Crocchette', ok: kibbleOk, detail: kibbleDetail }] : []),
  ]);
  const val = (e: HassEntity | undefined, f: (v: number) => string) => (e && Number.isFinite(+e.state) ? f(+e.state) : '—');
  // L'autonomia di NUT è in secondi, ma in HA si può scegliere di mostrarla in minuti o ore:
  // il valore arriva già convertito nell'unità scelta, quindi si riporta in secondi.
  const SEC: Record<string, number> = { s: 1, min: 60, h: 3600, d: 86400 };
  const seconds = (e: HassEntity | undefined) => (e ? +e.state * (SEC[e.attributes.unit_of_measurement] ?? 1) : NaN);
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
  {#if ups}
  <section class="card ups">
    <div class="head">
      <span class="ic" style:background={online ? 'var(--rack)' : 'var(--pericolo)'}><Icon name="ups" /></span>
      <div><h2>UPS</h2><p class="sub2">{online ? 'Alimentato dalla rete' : 'A batteria'}{upsIds.display ? ` · ${st(upsIds.display)}` : ''}</p></div>
    </div>
    <div class="gauge" role="meter" aria-label="Carica batterie UPS" aria-valuenow={charge} aria-valuemin="0" aria-valuemax="100">
      <i style:width="{charge}%"></i><span class="num">{charge}%</span>
    </div>
    <dl class="rows">
      <div><dt>Carico</dt><dd class="num">{val(hass.states[upsIds.load ?? ''], (v) => `${v}%`)}</dd></div>
      <div><dt>Autonomia stimata</dt><dd class="num">{duration(seconds(hass.states[upsIds.runtime ?? '']))}</dd></div>
      <div><dt>Tensione ingresso</dt><dd class="num">{val(hass.states[upsIds.voltage ?? ''], (v) => `${v} V`)}</dd></div>
    </dl>
    <p class="note">Sola lettura: NUT senza credenziali. L'autonomia è la stima dell'UPS, ottimista.</p>
  </section>
  {/if}

  {#if rack}
  <section class="card">
    <div class="head">
      <span class="ic" style:background="var(--rack)"><Icon name="rack" /></span>
      <div><h2>Rack</h2><p class="sub2">Presa protetta · si comanda solo da Zigbee2MQTT</p></div>
    </div>
    <dl class="rows">
      <div><dt>Potenza</dt><dd class="num">{val(rack, watt)}</dd></div>
      <div><dt>Tensione</dt><dd class="num">{val(rackOf('voltage'), (v) => `${Math.round(v)} V`)}</dd></div>
      <div><dt>Totale</dt><dd class="num">{val(rackOf('energy'), (v) => `${Math.round(v)} kWh`)}</dd></div>
    </dl>
  </section>
  {/if}

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
          <span class="what"><b>{a.attributes.friendly_name}</b>
            {#if confirmOff === a.entity_id}<small class="ask">Tocca di nuovo per disattivarla</small>
            {:else}<small>Ultima esecuzione {a.attributes.last_triggered ? ago(a.attributes.last_triggered) : 'mai'}</small>{/if}</span>
          <button class="sw" class:on={a.state === 'on'} role="switch" aria-checked={a.state === 'on'} aria-label="{a.attributes.friendly_name}: {a.state === 'on' ? 'attiva' : 'disattivata'}"
            onclick={() => toggleAuto(a)}></button>
        </li>
      {/each}
    </ul>
    {#if !autos.length}<p class="note">Nessuna automazione in Home Assistant.</p>{/if}
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

  {#if !hass.demo}
    <section class="card">
      <h2>Accesso</h2>
      <p class="sub2 acc">Collegato a Home Assistant{hass.user ? ` come ${hass.user}` : ''}{hass.panel ? ', con il token del pannello a muro' : ''}.</p>
      {#if hass.panel}
        <p class="note">Il token si revoca da Home Assistant, nel profilo di quell'utente, scheda Sicurezza.</p>
      {:else}
        <button class="pill out" onclick={logout}><Icon name="chiudi" size={20} />Esci da questo dispositivo</button>
        <p class="note">Per entrare di nuovo servono nome utente e password di Home Assistant.</p>
      {/if}
    </section>
  {/if}
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
  .what small.ask { color: var(--pericolo); font-weight: 600; }
  .state { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px; color: var(--ok); }
  .state i { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
  .state.bad { color: var(--pericolo); }
  .sw { width: 56px; height: 34px; border-radius: 17px; border: 0; background: var(--track); position: relative; cursor: pointer; transition: background-color 0.3s var(--ease); }
  .sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 28px; height: 28px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: transform 0.3s var(--ease); }
  .sw.on { background: var(--ok); }
  .sw.on::after { transform: translateX(22px); }
  .acc { margin: 6px 0 12px; }
  .out { background: var(--track); }
  .seg { display: flex; background: var(--track); border-radius: 14px; padding: 4px; margin-top: 12px; }
  .seg button { flex: 1; min-height: 44px; border: 0; border-radius: 10px; background: none; font-weight: 600; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: 1fr 1fr; align-items: start; } }
</style>
