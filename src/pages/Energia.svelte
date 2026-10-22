<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { iconOf, nameOf, switchOf } from '../lib/view';
  import { policyOf } from '../lib/policy';
  import { kw, kwh, watt } from '../lib/format';
  import type { HistoryPoint } from '../lib/ha/types';
  import { loadEnergyToday, valuesAt, type EnergyToday } from '../lib/ha/energy';
  import LineChart from '../lib/ui/LineChart.svelte';
  import BarChart from '../lib/ui/BarChart.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import CostiEnergia from '../lib/ui/CostiEnergia.svelte';
  import AndamentoEnergia from '../lib/ui/AndamentoEnergia.svelte';

  const sensors = $derived(Object.values(hass.states).filter((s) => s.attributes.device_class === 'power'));
  const total = $derived(sensors.reduce((a, s) => a + (+s.state || 0), 0));

  // Potenza totale nelle ultime 24 ore: ogni presa letta su una griglia di 5 minuti
  // (i sensori registrano in istanti diversi, quindi non si possono sommare punto per punto).
  const totalSeries = $derived.by(() => {
    const lists = sensors.map((s) => hass.history(s.entity_id)).filter((l) => l.length);
    if (!lists.length) return [];
    const now = Date.now();
    const grid: number[] = [];
    for (let t = now - 24 * 3600_000; t <= now; t += 5 * 60_000) grid.push(t);
    const sums = grid.map(() => NaN);
    for (const l of lists) valuesAt(l, grid).forEach((v, i) => { if (Number.isFinite(v)) sums[i] = (Number.isFinite(sums[i]) ? sums[i] : 0) + v; });
    return grid.map((t, i) => ({ t, v: sums[i] })).filter((p) => Number.isFinite(p.v));
  });

  // Energia di oggi: si ricarica quando cambia l'elenco delle prese e a ogni cambio d'ora.
  let energy = $state<EnergyToday | null>(null);
  let tried = $state(false);
  let hour = $state(new Date().getHours());
  $effect(() => {
    const i = setInterval(() => (hour = new Date().getHours()), 60_000);
    return () => clearInterval(i);
  });
  const idsKey = $derived(sensors.map((s) => s.entity_id).sort().join(','));
  $effect(() => {
    hour;
    const ids = idsKey ? idsKey.split(',') : [];
    loadEnergyToday(ids)
      .then((e) => (energy = e))
      .catch(() => (energy = null))
      .finally(() => (tried = true));
  });
  // Senza contatori kWh (o senza statistiche) non si mostra un «oggi 0 kWh» che sembrerebbe una misura.
  const todayTotal = $derived(energy && Object.keys(energy.byPower).length ? Object.values(energy.byPower).reduce((a, v) => a + v, 0) : NaN);
  const hourly = $derived(
    Array.from({ length: 24 }, (_, i) => ({
      label: String(i).padStart(2, '0'),
      v: i > hour ? 0 : (energy?.hourly[i] ?? 0),
      now: i === hour,
    })),
  );
  const rows = $derived(
    sensors
      .map((s) => ({ s, sw: switchOf(s.entity_id), today: energy?.byPower[s.entity_id], w: +s.state, p: policyOf(s.entity_id) }))
      .sort((a, b) => b.w - a.w),
  );
</script>

<header class="top">
  <h1>Energia</h1>
  <p class="sub">Prese con misura dei consumi</p>
</header>

<div class="layout">
  <section class="card now">
    <div class="big">
      <p class="label">Adesso</p>
      <p class="val num">{kw(total)}</p>
      {#if Number.isFinite(todayTotal)}<p class="label num">Oggi {kwh(todayTotal)}</p>{/if}
    </div>
    <LineChart label="Potenza totale nelle ultime 24 ore" series={totalSeries} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(v)))} />
  </section>

  <section class="card">
    <h2>Per presa</h2>
    <ul>
      {#each rows as r (r.s.entity_id)}
        <li>
          <button onclick={() => app.open({ kind: 'presa', id: r.sw?.entity_id ?? r.s.entity_id })}>
            <span class="ic" class:on={r.w > 1}><Icon name={iconOf(r.s)} /></span>
            <span class="what">
              <b>{nameOf(r.sw ?? r.s)}</b>
              <small class:warn={r.p.readOnly}>
                {#if r.p.readOnly}Sola lettura · {hass.areaName(hass.areaOf(r.s.entity_id))}{:else}{r.sw?.state === 'off' ? 'Spenta' : 'Accesa'} · {hass.areaName(hass.areaOf(r.s.entity_id))}{/if}
              </small>
              <span class="bar"><i style:width="{Math.min(100, (r.w / Math.max(total, 1)) * 100)}%"></i></span>
            </span>
            <span class="w num">{watt(r.w)}{#if r.today != null}<small>{kwh(r.today)} oggi</small>{/if}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <section class="card wide">
    <h2>Oggi, ora per ora</h2>
    <p class="sub2">kWh consumati dalle prese misurate</p>
    {#if energy && todayTotal > 0}
      <BarChart label="Consumo per ora di oggi" bars={hourly} format={(v) => v.toFixed(1).replace('.', ',')} />
    {:else if tried}
      <p class="empty">{energy ? 'Nessun consumo registrato oggi.' : 'Statistiche di Home Assistant non disponibili.'}</p>
    {/if}
  </section>

  <CostiEnergia ids={sensors.map((s) => s.entity_id)} today={todayTotal} />
  <AndamentoEnergia ids={sensors.map((s) => s.entity_id)} />
</div>

<style>
  .top { margin-bottom: 20px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 12px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .layout { display: grid; gap: 16px; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  .big { margin-bottom: 10px; }
  .label { color: var(--ink-2); font-size: 14.5px; }
  .val { font-size: 52px; font-weight: 700; letter-spacing: -0.04em; line-height: 1.05; color: var(--energia); }
  ul { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--sep); }
  li button { width: 100%; display: grid; grid-template-columns: 48px 1fr auto; gap: 12px; align-items: center; padding: 12px 0; border: 0; background: none; text-align: left; cursor: pointer; }
  li button:disabled { cursor: default; }
  .ic { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--track); color: var(--ink-2); }
  .ic.on { background: var(--energia); color: #fff; }
  .ic.on :global(.d) { fill-opacity: 0.32; }
  .what b { display: block; font-weight: 600; font-size: 15.5px; }
  .what small { display: block; font-size: 13px; color: var(--ink-2); }
  .what small.warn { color: var(--ink-2); }
  .bar { display: block; height: 4px; border-radius: 2px; background: var(--track); margin-top: 7px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--energia); border-radius: 2px; transition: width 0.6s var(--ease); }
  .w { text-align: right; font-weight: 700; font-size: 17px; }
  .empty { color: var(--ink-3); font-size: 14px; padding: 24px 0; text-align: center; }
  .w small { display: block; font-weight: 400; font-size: 12.5px; color: var(--ink-2); }
  @media (min-width: 720px) { h1 { font-size: 40px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: 1fr 1fr; align-items: start; } .wide { grid-column: 1 / -1; } }
</style>
