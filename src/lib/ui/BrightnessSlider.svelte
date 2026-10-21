<script lang="ts">
  // Slider verticale a pillola: si trascina ovunque sulla pillola, come in Apple Casa.
  // Tastiera: frecce ±5%, Pagina ±25%, Home/Fine.
  let { value, onchange, label, color = 'var(--luci)', off = false }:
    { value: number; onchange: (v: number) => void; label: string; color?: string; off?: boolean } = $props();

  let el: HTMLDivElement;
  let dragging = $state(false);
  let local = $state(0);
  const shown = $derived(dragging ? local : off ? 0 : value);

  function fromY(y: number) {
    const r = el.getBoundingClientRect();
    return Math.round(Math.min(100, Math.max(0, ((r.bottom - y) / r.height) * 100)));
  }
  function down(e: PointerEvent) {
    el.setPointerCapture(e.pointerId);
    dragging = true;
    local = fromY(e.clientY);
  }
  function move(e: PointerEvent) { if (dragging) local = fromY(e.clientY); }
  function up() { if (!dragging) return; dragging = false; onchange(local); }
  function key(e: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 25, PageDown: -25 };
    let v = shown;
    if (e.key in steps) v += steps[e.key];
    else if (e.key === 'Home') v = 0;
    else if (e.key === 'End') v = 100;
    else return;
    e.preventDefault();
    onchange(Math.min(100, Math.max(0, v)));
  }
</script>

<div class="wrap">
  <div class="pill" bind:this={el} style:--c={color} class:dragging
    role="slider" tabindex="0" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={shown}
    aria-valuetext={shown === 0 ? 'Spenta' : `${shown}%`}
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onkeydown={key}>
    <div class="fill" style:height="{shown}%"></div>
  </div>
  <p class="v num">{shown === 0 ? 'Spenta' : `${shown}%`}</p>
</div>

<style>
  .wrap { display: grid; justify-items: center; gap: 14px; }
  .pill {
    position: relative; overflow: hidden;
    width: 112px; height: min(340px, 44vh);
    border-radius: 34px;
    background: var(--track);
    touch-action: none; cursor: ns-resize;
    transition: transform 0.3s var(--ease);
  }
  .pill.dragging { transform: scale(1.03); }
  .fill {
    position: absolute; left: 0; right: 0; bottom: 0;
    background: linear-gradient(to top, var(--c), color-mix(in srgb, var(--c) 70%, #fff));
    transition: height 0.25s var(--ease);
  }
  .dragging .fill { transition: none; }
  .v { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
</style>
