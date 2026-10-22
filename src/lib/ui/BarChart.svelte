<script lang="ts">
  // Barre orarie (es. kWh per ora di oggi). L'ora in corso è evidenziata.
  // every: un'etichetta ogni quante barre, contando dall'ultima (senza: una ogni 3, 4 sul telefono, dalla prima).
  let { bars, color = 'var(--energia)', height = 160, label, format = (v: number) => v.toFixed(1), every }:
    { bars: { label: string; v: number; now?: boolean }[]; color?: string; height?: number; label: string; format?: (v: number) => string; every?: number } = $props();

  let W = $state(600);
  const PADB = 22, PADT = 8;
  const hi = $derived(Math.max(...bars.map((b) => b.v), 0.1) * 1.1);
  // Spazio a sinistra quanto basta per l'etichetta più lunga dell'asse (es. «144 €»).
  const PADL = $derived(Math.max(36, Math.max(...[0, hi / 2, hi].map((g) => format(g).length)) * 7 + 8));
  const bw = $derived((W - PADL) / bars.length);
</script>

<div bind:clientWidth={W}>
<svg viewBox="0 0 {W} {height}" role="img" aria-label={label} style:--c={color}>
  {#each [0, hi / 2, hi] as g}
    {@const yy = PADT + (1 - g / hi) * (height - PADT - PADB)}
    <line x1={PADL} x2={W} y1={yy} y2={yy} class="grid" />
    <text x={PADL - 6} y={yy + 4} class="ax" text-anchor="end">{format(g)}</text>
  {/each}
  {#each bars as b, i}
    {@const h = (b.v / hi) * (height - PADT - PADB)}
    <rect x={PADL + i * bw + bw * 0.18} y={height - PADB - h} width={bw * 0.64} height={Math.max(h, 1.5)} rx={Math.min(4, bw * 0.3)} class:now={b.now}><title>{b.label}: {format(b.v)}</title></rect>
    {#if every ? (bars.length - 1 - i) % every === 0 : i % (W < 500 ? 4 : 3) === 0}<text x={PADL + i * bw + bw / 2} y={height - 5} class="ax" text-anchor="middle">{b.label}</text>{/if}
  {/each}
</svg>
</div>

<style>
  svg { width: 100%; height: auto; display: block; }
  rect { fill: color-mix(in srgb, var(--c) 45%, transparent); }
  rect.now { fill: var(--c); }
  .grid { stroke: var(--sep); }
  .ax { fill: var(--ink-3); font-size: 12px; font-variant-numeric: tabular-nums; }
</style>
