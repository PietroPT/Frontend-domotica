<script lang="ts">
  // Controllo "scorri per entrare": evita di aprire Avanzate per sbaglio.
  // Da tastiera: Invio o barra spaziatrice tenuti premuti fanno avanzare il cursore.
  import Icon from './Icon.svelte';

  let { label = 'Scorri per Avanzate', onunlock, tone = 'var(--rack)' }:
    { label?: string; onunlock: () => void; tone?: string } = $props();

  let track: HTMLDivElement;
  let x = $state(0); // 0..1
  let dragging = $state(false);
  let start = 0, startX = 0;

  const travel = () => track.clientWidth - 60;
  function down(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = true; start = e.clientX; startX = x;
  }
  function move(e: PointerEvent) {
    if (dragging) x = Math.min(1, Math.max(0, startX + (e.clientX - start) / travel()));
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    if (x > 0.92) { x = 1; setTimeout(onunlock, 120); } else x = 0;
  }
  let timer: ReturnType<typeof setInterval> | undefined;
  function keydown(e: KeyboardEvent) {
    if ((e.key !== 'Enter' && e.key !== ' ') || timer) return;
    e.preventDefault();
    timer = setInterval(() => { x = Math.min(1, x + 0.06); if (x >= 1) { clearInterval(timer); timer = undefined; onunlock(); } }, 30);
  }
  function keyup() { clearInterval(timer); timer = undefined; if (x < 1) x = 0; }
</script>

<div class="track" bind:this={track} style:--tone={tone} class:dragging style:--x={x}>
  <span class="label" style:opacity={1 - x * 1.6}>{label}</span>
  <button class="knob" style:transform="translateX(calc(var(--x) * (100cqw - 60px)))"
    aria-label="{label}: tieni premuto Invio o trascina verso destra"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
    onkeydown={keydown} onkeyup={keyup}>
    <Icon name={x >= 1 ? 'avanzate' : 'lucchetto'} size={22} />
  </button>
</div>

<style>
  .track {
    container-type: inline-size;
    position: relative;
    height: 60px; border-radius: 30px; padding: 6px;
    background: var(--tile);
    box-shadow: inset 0 0 0 1px var(--sep);
    overflow: hidden;
  }
  .track::before {
    content: ''; position: absolute; inset: 0;
    width: calc(var(--x) * 100% + 30px);
    background: color-mix(in srgb, var(--tone) 22%, transparent);
  }
  .label {
    position: absolute; inset: 0; display: grid; place-items: center; padding-left: 40px;
    font-weight: 600; font-size: 15.5px; color: var(--ink-2); pointer-events: none;
    background: linear-gradient(90deg, var(--ink-2) 0%, var(--ink-2) 40%, var(--ink) 50%, var(--ink-2) 60%, var(--ink-2) 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    animation: shine 3.2s linear infinite;
  }
  .knob {
    position: relative; z-index: 1;
    width: 48px; height: 48px; border-radius: 50%; border: 0; padding: 0;
    display: grid; place-items: center;
    background: var(--tone); color: #fff;
    box-shadow: 0 4px 12px -4px color-mix(in srgb, var(--tone) 70%, transparent);
    cursor: grab; touch-action: none;
    transition: transform 0.45s var(--ease);
  }
  .dragging .knob { transition: none; cursor: grabbing; }
  @media (prefers-reduced-motion: reduce) {
    .label { animation: none; -webkit-text-fill-color: var(--ink-2); }
  }
  @keyframes shine { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
