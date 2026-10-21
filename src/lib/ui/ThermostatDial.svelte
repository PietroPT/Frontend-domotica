<script lang="ts">
  import Icon from './Icon.svelte';
  import { temp } from '../format';

  let { target, current, min = 5, max = 30, step = 0.5, mode, action, onchange, size = 300 }:
    { target: number; current: number; min?: number; max?: number; step?: number; mode: string; action: string;
      onchange: (t: number) => void; size?: number } = $props();

  const A0 = 135, A1 = 405, R = 120, C = 150;
  let svg: SVGSVGElement;
  let dragging = $state(false);
  let local = $state(0);
  // Dopo il rilascio il valore nuovo resta visibile finché HA non lo conferma (max 5 s).
  let pending = $state(false);
  let pendingTimer = 0;
  $effect(() => { if (pending && target === local) pending = false; });
  const shown = $derived(dragging || pending ? local : target);

  // A riposo il numero grande è la temperatura della stanza; mentre si modifica (trascinando,
  // con i tasti, con +/− della pagina) diventa la temperatura impostata, fino a 2,5 s dopo.
  let recent = $state(false);
  let recentTimer = 0;
  let prev: number | undefined;
  $effect(() => {
    const t = target;
    if (prev !== undefined && t !== prev) {
      recent = true;
      clearTimeout(recentTimer);
      recentTimer = window.setTimeout(() => (recent = false), 2500);
    }
    prev = t;
  });
  const editing = $derived(dragging || pending || recent);
  const off = $derived(mode === 'off');
  const color = $derived(off ? 'var(--ink-3)' : action === 'heating' ? 'var(--caldo)' : 'var(--clima)');

  const ang = (t: number) => A0 + ((Math.min(max, Math.max(min, t)) - min) / (max - min)) * (A1 - A0);
  const pt = (a: number, r = R) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
  const arc = (a: number, b: number) => {
    const [x0, y0] = pt(a), [x1, y1] = pt(b);
    return `M${x0} ${y0}A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const snap = (t: number) => Math.min(max, Math.max(min, Math.round(t / step) * step));

  function fromPointer(e: PointerEvent) {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300 - C, y = ((e.clientY - r.top) / r.height) * 300 - C;
    let a = (Math.atan2(y, x) * 180) / Math.PI;
    if (a < 90) a += 360; // 135..405 continuo
    a = Math.min(A1, Math.max(A0, a));
    return snap(min + ((a - A0) / (A1 - A0)) * (max - min));
  }
  function down(e: PointerEvent) { if (off) return; svg.setPointerCapture(e.pointerId); dragging = true; local = fromPointer(e); }
  function move(e: PointerEvent) { if (dragging) local = fromPointer(e); }
  function up() {
    if (!dragging) return;
    dragging = false;
    if (local === target) return;
    pending = true;
    clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => (pending = false), 5000);
    onchange(local);
  }
  function key(e: KeyboardEvent) {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? step : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -step : 0;
    if (!d || off) return;
    e.preventDefault();
    onchange(snap(target + d));
  }

  const ticks = $derived(Array.from({ length: (max - min) + 1 }, (_, i) => min + i));
  const [kx, ky] = $derived(pt(ang(shown)));
  const [cx, cy] = $derived(pt(ang(current), R - 22));
</script>

<div class="dial" style:--size="{size}px" style:--c={color}>
  <svg bind:this={svg} viewBox="0 0 300 300" role="slider" tabindex="0"
    aria-label="Temperatura desiderata, stanza a {temp(current)}" aria-valuemin={min} aria-valuemax={max} aria-valuenow={shown}
    aria-valuetext={off ? 'Spento' : temp(shown)} aria-disabled={off}
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydown={key}>
    <path d={arc(A0, A1)} class="track" />
    {#if !off}<path d={arc(A0, ang(shown))} class="active" />{/if}
    {#each ticks as t}
      {@const [x0, y0] = pt(ang(t), R - 18)}
      {@const [x1, y1] = pt(ang(t), R - (t % 5 ? 24 : 28))}
      <line x1={x0} y1={y0} x2={x1} y2={y1} class="tick" class:major={t % 5 === 0} />
    {/each}
    <circle cx={cx} cy={cy} r="4.5" class="now" />
    {#if !off}<circle cx={kx} cy={ky} r="15" class="knob" class:dragging />{/if}
  </svg>
  <div class="read" aria-hidden="true">
    <span class="mode">
      {#if off}Spento{:else}<Icon name={action === 'heating' ? 'fiamma' : 'ok'} size={18} />{action === 'heating' ? 'Riscalda' : 'In temperatura'}{/if}
    </span>
    {#if editing && !off}
      <b class="num set">{temp(shown)}</b>
      <span class="num">Ora {temp(current)}</span>
    {:else}
      <b class="num">{temp(current)}</b>
      <!-- Obiettivo: solo il numero, nel colore del termostato (scelta di Pietro). -->
      {#if !off}<span class="num tgt">{temp(shown)}</span>{/if}
    {/if}
  </div>
</div>

<style>
  .dial { position: relative; width: var(--size); max-width: 100%; aspect-ratio: 1; margin-bottom: calc(var(--size) * -0.1); }
  svg { width: 100%; height: 100%; touch-action: none; cursor: grab; display: block; }
  svg[aria-disabled='true'] { cursor: default; }
  svg:focus:not(:focus-visible) { outline: none; }
  .track { fill: none; stroke: var(--track); stroke-width: 18; stroke-linecap: round; }
  .active { fill: none; stroke: var(--c); stroke-width: 18; stroke-linecap: round; transition: stroke 0.4s var(--ease); }
  .tick { stroke: var(--ink-3); stroke-width: 1.4; stroke-linecap: round; opacity: 0.55; }
  .tick.major { stroke-width: 2.4; opacity: 0.9; }
  .now { fill: var(--ink); }
  .knob { fill: var(--raised); stroke: var(--c); stroke-width: 5; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25)); transition: r 0.2s var(--ease); }
  .knob.dragging { r: 18; }
  .read { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 2px; pointer-events: none; }
  .mode { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 15px; color: var(--c); }
  b { font-size: calc(var(--size) * 0.2); font-weight: 700; letter-spacing: -0.04em; line-height: 1; }
  b.set { color: var(--c); }
  .read > span:last-child { color: var(--ink-2); font-size: 15px; }
  .read > span.tgt { color: var(--c); font-weight: 600; font-size: 17px; }
</style>
