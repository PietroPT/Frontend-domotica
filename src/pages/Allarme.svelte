<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { ago } from '../lib/format';
  import { iconOf, nameOf } from '../lib/view';
  import { cameraNotifications } from '../lib/camera-notifications';
  import { defaultSecurityLayout, loadSecurityLayout, saveSecurityLayout, ordered, moved, SECTION_TITLES, type SecurityLayout } from '../lib/security-layout';
  import Icon from '../lib/ui/Icon.svelte';
  import Sheet from '../lib/ui/Sheet.svelte';
  import OrderModeButton from '../lib/ui/OrderModeButton.svelte';
  import OrderControls from '../lib/ui/OrderControls.svelte';
  import CameraNotifications from '../lib/ui/CameraNotifications.svelte';

  const KINDS: Record<string, string> = { motion: 'Movimento', occupancy: 'Presenza', door: 'Porta', window: 'Finestra', opening: 'Apertura' };
  const sensors = $derived(hass.entities('binary_sensor').filter((s) => s.attributes.device_class in KINDS && !hass.isBackground(s.entity_id)).sort((a, b) => nameOf(a).localeCompare(nameOf(b))));
  const panels = $derived(hass.entities('alarm_control_panel'));
  const notifications = $derived(cameraNotifications(hass.entities('automation')).rows);
  let settings = $state(defaultSecurityLayout());
  let editing = $state(false), loading = $state(false), loaded = $state(false), busy = $state(false);
  let error = $state('');
  const canEdit = $derived(hass.admin && hass.connected && hass.status === 'ready');
  const rearranging = $derived(editing && hass.admin);
  const sheetId = $derived(app.sheet?.kind === 'sicurezza' ? app.sheet.id : null);
  const rows = $derived(ordered(sensors, settings.sensors, s => s.entity_id));

  async function sync(force = false) {
    if ((!force && (editing || sheetId)) || loading || busy || hass.status !== 'ready') return;
    loading = true;
    try {
      const value = await loadSecurityLayout(hass.demo);
      if (force || (!editing && !sheetId)) { settings = value; loaded = true; error = ''; }
    } catch (e: any) { error = `Personalizzazioni non caricate: ${e?.message ?? e}`; }
    finally { loading = false; }
  }
  $effect(() => { if (hass.status === 'ready') untrack(() => { void sync(true); }); });
  $effect(() => { if (!hass.admin) editing = false; });
  onMount(() => {
    const refresh = () => { if (!document.hidden) void sync(); };
    const interval = setInterval(refresh, 300_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  });
  function editOrder(value: boolean) {
    if (busy || (value && (!canEdit || !loaded || loading))) return;
    editing = value;
    if (!value) void sync();
  }
  async function persist(next: SecurityLayout) {
    if (!canEdit || !loaded) throw new Error('Serve un account amministratore collegato.');
    if (busy) throw new Error('Attendi il salvataggio in corso.');
    busy = true;
    try { settings = await saveSecurityLayout(hass.demo, next); error = ''; }
    finally { busy = false; }
  }
  async function move(kind: 'sections' | 'sensors' | 'notifications', index: number, direction: number) {
    const list = kind === 'sections' ? settings.sections : kind === 'sensors' ? rows.map(s => s.entity_id) : ordered(notifications, settings.notifications, r => r.alias).map(r => r.alias);
    try { await persist({ ...settings, [kind]: moved(list, index, direction) }); }
    catch (e: any) { hass.say(`Ordine non salvato: ${e?.message ?? e}`); }
  }
  function title(id: string) { return settings.titles[id]?.trim() || SECTION_TITLES[id]; }
  function sensorName(id: string) { return settings.sensorNames[id]?.trim() || (hass.states[id] ? nameOf(hass.states[id]) : id); }
  function notificationName(id: string) {
    const row = notifications.find(r => r.alias === id);
    return settings.notificationNames[id]?.trim() || (row ? `${row.camera} · ${row.label}` : id);
  }
  function item(id: string | null): { field: 'titles' | 'sensorNames' | 'notificationNames'; key: string; name: string } | null {
    if (!id) return null;
    if (Object.hasOwn(SECTION_TITLES, id)) return { field: 'titles', key: id, name: title(id) };
    if (sensors.some(s => s.entity_id === id)) return { field: 'sensorNames', key: id, name: sensorName(id) };
    if (notifications.some(r => r.alias === id)) return { field: 'notificationNames', key: id, name: notificationName(id) };
    return null;
  }
  const selected = $derived(item(sheetId));
  function open(id: string) { if (!rearranging && canEdit && loaded && !busy) app.open({ kind: 'sicurezza', id }); }
  async function rename(value: string) {
    if (!selected) throw new Error('Voce non disponibile.');
    const { field, key } = selected;
    await persist({ ...settings, [field]: { ...settings[field], [key]: value.trim() } });
  }
</script>

<header class="top">
  <div><h1>Sicurezza</h1><p class="sub">Telecamere e avvisi di casa</p></div>
  {#if hass.admin}<OrderModeButton editing={rearranging} disabled={busy || (!rearranging && (!canEdit || !loaded || loading))} onchange={editOrder} />{/if}
</header>
{#if error}<p class="message error" role="alert">{error} <button onclick={() => sync(true)}>Riprova</button></p>{/if}
{#if rearranging}<p class="demo">Sposta i riquadri e le voci con le frecce. L'ordine vale per tutti: telefono, PC, pannello e ogni utente.</p>{/if}
<div class="layout">
  {#each settings.sections as section, index (section)}
    <div class="slot" class:ordering={rearranging} data-section={section}>
      {#if rearranging}<div class="section-move"><OrderControls name={title(section)} first={index === 0} last={index === settings.sections.length - 1} disabled={busy || !canEdit} overlay={false} onmove={d => move('sections', index, d)} /></div>{/if}
      {#if section === 'notifiche'}
        <CameraNotifications title={title(section)} rowOrder={settings.notifications} rowNames={settings.notificationNames}
          editing={rearranging} editDisabled={busy || !canEdit} onOpenTitle={canEdit && loaded && !busy ? () => open(section) : undefined}
          onOpenRow={canEdit && loaded && !busy ? open : undefined} onMoveRow={(index, d) => move('notifications', index, d)} />
      {:else if section === 'allarme'}
        <section class="card intro"><span class="ic"><Icon name="allarme" size={30} /></span>
          <div><h2>{#if canEdit && loaded && !rearranging}<button class="name" onclick={() => open(section)} aria-label="Apri {title(section)}">{title(section)}</button>{:else}{title(section)}{/if}</h2>
            <p>Non ancora configurato. Qui arriveranno inserimento, zone e sensori.</p>
            {#if panels.length}<p class="note">In Home Assistant c'è già: {panels.map(p => nameOf(p)).join(', ')}.</p>{/if}
          </div>
        </section>
      {:else if section === 'sensori'}
        <section class="card"><h2>{#if canEdit && loaded && !rearranging}<button class="name" onclick={() => open(section)} aria-label="Apri {title(section)}">{title(section)}</button>{:else}{title(section)}{/if}</h2><p class="sub2">Movimento, presenza e aperture rilevati in casa</p>
          {#if rows.length}
            <ul>{#each rows as s, i (s.entity_id)}
              <li class:ordering={rearranging} data-row={s.entity_id}>
                <span class="ic small" class:on={s.state === 'on'}><Icon name={iconOf(s)} /></span>
                <button class="what" disabled={!canEdit || !loaded || rearranging || busy} onclick={() => open(s.entity_id)} aria-label="Apri {sensorName(s.entity_id)}"><b>{sensorName(s.entity_id)}</b><small>{KINDS[s.attributes.device_class]} · {hass.areaName(hass.areaOf(s.entity_id))}</small></button>
                <span class="st">{s.state === 'on' ? 'Rilevato ora' : s.state === 'unavailable' || s.state === 'unknown' ? 'Non disponibile' : ago(s.last_changed)}</span>
                {#if rearranging}<OrderControls name={sensorName(s.entity_id)} first={i === 0} last={i === rows.length - 1} disabled={busy || !canEdit} onmove={d => move('sensors', i, d)} />{/if}
              </li>
            {/each}</ul>
          {:else}<p class="note">Nessun sensore di movimento o di apertura in Home Assistant.</p>{/if}
        </section>
      {/if}
    </div>
  {/each}
</div>
{#if sheetId && selected}
  <Sheet title={selected.name} onclose={() => { app.close(); void sync(true); }} rename={canEdit && loaded ? rename : undefined}
    renameHint="Il nome vale per tutti i dispositivi in Sicurezza. Lascia vuoto per tornare al nome originale.">
    {#if selected.field === 'sensorNames'}
      {@const sensor = hass.states[selected.key]}
      <p class="detail">{KINDS[sensor.attributes.device_class]} · {hass.areaName(hass.areaOf(selected.key))}</p>
      <p class="detail">{sensor.state === 'on' ? 'Rilevato ora' : sensor.state === 'unavailable' || sensor.state === 'unknown' ? 'Non disponibile' : ago(sensor.last_changed)}</p>
    {:else}<p class="detail">{selected.field === 'titles' ? 'Elenco della pagina Sicurezza.' : 'Avviso delle telecamere.'}</p>{/if}
  </Sheet>
{/if}

<style>
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -.02em; overflow-wrap: anywhere; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 8px; }
  .layout { display: grid; gap: 16px; align-items: start; }
  .slot { min-width: 0; position: relative; }
  .slot.ordering { outline: 2px dashed var(--sep); outline-offset: -2px; border-radius: var(--r-card); }
  .section-move { padding: 8px 4px; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; min-width: 0; }
  .intro { display: flex; gap: 14px; align-items: flex-start; }
  .intro > div { min-width: 0; }
  .intro p, .detail { color: var(--ink-2); font-size: 15px; line-height: 1.45; margin-top: 4px; }
  .ic { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--sicurezza); color: #fff; flex: none; }
  .ic :global(.d) { fill-opacity: .32; }
  .ic.small { width: 44px; height: 44px; background: var(--track); color: var(--ink-2); }
  .ic.small.on { background: var(--sicurezza); color: #fff; }
  .note { font-size: 13.5px; color: var(--ink-2); margin-top: 8px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { position: relative; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; }
  li.ordering { outline: 2px dashed var(--sep); outline-offset: -2px; border-radius: var(--r-tile); }
  li + li { border-top: 1px solid var(--sep); }
  .what b { display: block; font-weight: 600; font-size: 15px; overflow-wrap: anywhere; }
  .what small { display: block; font-size: 13px; color: var(--ink-2); }
  .st { font-size: 13.5px; color: var(--ink-2); text-align: right; max-width: 90px; }
  .name, .what { border: 0; background: none; color: inherit; padding: 0; font: inherit; text-align: left; cursor: pointer; min-width: 0; }
  .name { min-height: 44px; }
  .what { min-height: 48px; }
  .what:disabled { cursor: default; }
  .demo { font-size: 13px; color: var(--ink-2); background: var(--tile); border-radius: 12px; padding: 8px 12px; margin-bottom: 18px; }
  .message { padding: 14px; border-radius: 14px; background: var(--tile); font-size: 14px; line-height: 1.45; margin-bottom: 16px; overflow-wrap: anywhere; }
  .error { color: var(--pericolo); }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
</style>
