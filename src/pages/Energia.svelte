<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { iconOf, nameOf, switchOf } from '../lib/view';
  import { policyOf } from '../lib/policy';
  import { kw, kwh, watt } from '../lib/format';
  import type { HistoryPoint } from '../lib/ha/types';
  import LineChart from '../lib/ui/LineChart.svelte';
  import BarChart from '../lib/ui/BarChart.svelte';
  import Icon from '../lib/ui/Icon.svelte';

  const sensors = $derived(Object.values(hass.states).filter((s) => s.attributes.device_class === 'power'));
  const total = $derived(sensors.reduce((a, s) => a + (+s.state || 0), 0));

  // Somma delle cronologie (stessi istanti nei dati di esempio).
  const totalSeries = $derived.by(() => {
    const out: HistoryPoint[] = [];
    const lists = sensors.map((s) => hass.history(s.entity_id));
    lists[0]?.forEach((p, i) => out.push({ t: p.t, v: lists.reduce((a, l) => a + (l[i]?.v ?? 0), 0) }));
    return out;
  });
  const midnight = new Date().setHours(0, 0, 0, 0);
  const energyToday = (s: HistoryPoint[]) => s.filter((p) => p.t >= midnight).reduce((a, p) => a + (p.v * 5) / 60 / 1000, 0);
  const hourly = $derived.by(() => {
    const h = new Date().getHours();
    return Array.from({ length: 24 }, (_, i) => ({
      label: String(i).padStart(2, '0'),
      v: i > h ? 0 : totalSeries.filter((p) => p.t >= midnight + i * 3600_000 && p.t < midnight + (i + 1) * 3600_000).reduce((a, p) => a + (p.v * 5) / 60 / 1000, 0),
      now: i === h,
    }));
  });
  const rows = $derived(
    sensors
      .map((s) => {
        return { s, sw: switchOf(s.entity_id), today: energyToday(hass.history(s.entity_id)), w: +s.state, p: policyOf(s.entity_id) };
      })
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
      {#if totalSeries.length}<p class="label num">Oggi {kwh(energyToday(totalSeries))}</p>{/if}
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
              <b>{nameOf(r.s)}</b>
              <small class:warn={r.p.readOnly || r.p.noRemoteOn}>
                {#if r.p.readOnly}Sola lettura · {hass.areaName(hass.areaOf(r.s.entity_id))}{:else if r.p.noRemoteOn && r.sw?.state === 'off'}Spenta · non si accende a distanza{:else}{r.sw?.state === 'off' ? 'Spenta' : 'Accesa'} · {hass.areaName(hass.areaOf(r.s.entity_id))}{/if}
              </small>
              <span class="bar"><i style:width="{Math.min(100, (r.w / Math.max(total, 1)) * 100)}%"></i></span>
            </span>
            <span class="w num">{watt(r.w)}{#if totalSeries.length}<small>{kwh(r.today)} oggi</small>{/if}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <section class="card wide">
    <h2>Oggi, ora per ora</h2>
    <p class="sub2">kWh consumati dalle prese misurate</p>
    {#if totalSeries.length}
      <BarChart label="Consumo per ora di oggi" bars={hourly} format={(v) => v.toFixed(1).replace('.', ',')} />
    {:else}
      <p class="empty">Cronologia non ancora collegata.</p>
    {/if}
  </section>
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
