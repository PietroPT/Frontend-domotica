<script lang="ts">
  // Grafico a linea della cronologia: asse orario, tre righe guida, valore attuale evidenziato.
  import type { HistoryPoint } from '../ha/types';

  let { series, color = 'var(--energia)', unit = '', hours = 24, height = 180, format = (v: number) => String(Math.round(v)), dashed, label }:
    { series: HistoryPoint[]; color?: string; unit?: string; hours?: number; height?: number;
      format?: (v: number) => string; dashed?: HistoryPoint[]; label: string } = $props();

  let W = $state(600);
  const PADL = 44, PADB = 24, PADT = 10;
  const gid = 'g' + Math.random().toString(36).slice(2, 8);
  // «Ora» si ricalcola a ogni punto nuovo, così il grafico scorre con i dati dal vivo.
  const t1 = $derived(Math.max(Date.now(), series.at(-1)?.t ?? 0));
  const t0 = $derived(t1 - hours * 3600_000);
  // HA registra un valore solo quando cambia: l'ultimo vale fino a ora.
  const pts = $derived.by(() => {
    const p = series.filter((q) => q.t >= t0);
    const last = p.at(-1);
    return last && last.t < t1 - 60_000 ? [...p, { t: t1, v: last.v }] : p;
  });
  const all = $derived([...pts, ...(dashed ?? []).filter((p) => p.t >= t0)].map((p) => p.v));
  const lo = $derived(Math.min(...all) >= 0 && Math.min(...all) < Math.max(...all) * 0.3 ? 0 : Math.floor(Math.min(...all) - 0.5));
  // Massimo «tondo» (1, 2, 2,5, 5 × 10^n) per righe guida leggibili.
  const nice = (v: number) => { const m = 10 ** Math.floor(Math.log10(v || 1)); return [1, 2, 2.5, 5, 10].map((k) => k * m).find((k) => k >= v)!; };
  const hi = $derived(lo === 0 ? nice(Math.max(...all) * 1.05) : Math.ceil(Math.max(...all) + 0.5));
  const x = (t: number) => PADL + ((t - t0) / (t1 - t0)) * (W - PADL - 8);
  const y = (v: number) => PADT + (1 - (v - lo) / (hi - lo || 1)) * (height - PADT - PADB);
  const path = (s: HistoryPoint[]) => s.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
  const area = $derived(pts.length ? `${path(pts)}L${x(pts.at(-1)!.t)} ${height - PADB}L${x(pts[0].t)} ${height - PADB}Z` : '');
  const grid = $derived([lo, (lo + hi) / 2, hi]);
  const nTicks = $derived(W < 480 ? 3 : 5);
  const hoursTicks = $derived(Array.from({ length: nTicks }, (_, i) => t0 + (i * (t1 - t0)) / (nTicks - 1)));
  const last = $derived(pts.at(-1));
</script>

<figure bind:clientWidth={W}>
  {#if !pts.length}
    <p class="empty" style:height="{height}px">Cronologia non ancora collegata.</p>
  {:else}
  <svg viewBox="0 0 {W} {height}" role="img" aria-label={label} style:--c={color}>
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={color} stop-opacity=".28" /><stop offset="1" stop-color={color} stop-opacity="0" />
      </linearGradient>
    </defs>
    {#each grid as g}
      <line x1={PADL} x2={W - 8} y1={y(g)} y2={y(g)} class="grid" />
      <text x={PADL - 8} y={y(g) + 4} class="ax" text-anchor="end">{format(g)}</text>
    {/each}
    {#each hoursTicks as t, i}
      <text x={x(t)} y={height - 6} class="ax" text-anchor={i === 0 ? 'start' : i === nTicks - 1 ? 'end' : 'middle'}>
        {i === nTicks - 1 ? 'ora' : new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
      </text>
    {/each}
    <path d={area} fill="url(#{gid})" />
    {#if dashed}<path d={path(dashed.filter((p) => p.t >= t0))} class="dash" />{/if}
    <path d={path(pts)} class="line" />
    {#if last}<circle cx={x(last.t)} cy={y(last.v)} r="5" class="end" />{/if}
  </svg>
  {/if}
  {#if unit}<figcaption>{unit}</figcaption>{/if}
</figure>

<style>
  figure { margin: 0; position: relative; }
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .grid { stroke: var(--sep); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .ax { fill: var(--ink-3); font-size: 12px; font-variant-numeric: tabular-nums; }
  .line { fill: none; stroke: var(--c); stroke-width: 2.4; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .dash { fill: none; stroke: var(--ink-3); stroke-width: 1.6; stroke-dasharray: 5 5; vector-effect: non-scaling-stroke; }
  .end { fill: var(--raised); stroke: var(--c); stroke-width: 3; }
  .empty { display: grid; place-items: center; margin: 0; color: var(--ink-3); font-size: 14px; }
  figcaption { position: absolute; top: -2px; left: 0; font-size: 12px; color: var(--ink-3); }
</style>
