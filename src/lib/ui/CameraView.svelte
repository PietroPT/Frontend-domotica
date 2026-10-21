<script lang="ts">
  // Fase 1: scena disegnata al posto del video. Fase 2: flusso della telecamera
  // tramite Home Assistant (camera/stream → HLS), come oggi nell'app di HA.
  import { clock } from '../format';
  let { name, portrait = false, motion = false, big = false }:
    { name: string; portrait?: boolean; motion?: boolean; big?: boolean } = $props();
  let t = $state(clock());
  $effect(() => { const i = setInterval(() => (t = big ? new Date().toLocaleTimeString('it-IT') : clock()), 1000); return () => clearInterval(i); });
</script>

<div class="cam" class:portrait class:big>
  {#if portrait}
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a46" /><stop offset="1" stop-color="#1c1c24" /></linearGradient></defs>
      <rect width="300" height="400" fill="url(#sg)" />
      <rect x="36" y="44" width="128" height="160" fill="#7a86a8" opacity=".5" />
      <path d="M100 44v160M36 124h128" stroke="#23232c" stroke-width="6" />
      <rect x="30" y="250" width="240" height="44" rx="16" fill="#5a5160" />
      <rect x="18" y="282" width="264" height="64" rx="18" fill="#4a4250" />
      <rect x="40" y="258" width="70" height="34" rx="10" fill="#6f6574" />
      <path d="M236 112v150" stroke="#9a98a8" stroke-width="5" />
      <path d="M218 112h36l-7-34h-22z" fill="#e8d18f" opacity=".9" />
      <rect x="0" y="346" width="300" height="54" fill="#2a2730" />
    </svg>
  {:else}
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="300" fill="#26262c" />
      <rect x="0" y="196" width="400" height="104" fill="#323238" />
      <rect x="24" y="26" width="96" height="116" fill="#6f7ea6" opacity=".45" />
      <rect x="54" y="152" width="290" height="14" fill="#7a6552" />
      <rect x="146" y="70" width="116" height="74" rx="6" fill="#121218" stroke="#5f5f6a" stroke-width="5" />
      <rect x="194" y="144" width="20" height="10" fill="#5f5f6a" />
      <rect x="282" y="92" width="74" height="60" fill="#40404a" stroke="#70707e" stroke-width="4" />
      <rect x="302" y="114" width="34" height="26" fill="#e8913a" opacity=".85" />
      <rect x="90" y="196" width="60" height="70" rx="10" fill="#3d3d46" />
    </svg>
  {/if}
  <span class="live"><i></i>LIVE</span>
  {#if motion}<span class="motion">Movimento</span>{/if}
  <span class="foot"><b>{name}</b><span class="num">{t}</span></span>
</div>

<style>
  .cam { container-type: inline-size; position: relative; overflow: hidden; border-radius: var(--r-tile); background: #18181c; aspect-ratio: 4 / 3; }
  .cam.portrait { aspect-ratio: 3 / 4; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .live, .motion {
    position: absolute; top: 10px; display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.02em; color: #fff;
    padding: 4px 9px; border-radius: 8px; background: rgba(0, 0, 0, 0.45);
  }
  .live { left: 10px; }
  .live i { width: 7px; height: 7px; border-radius: 50%; background: #ff453a; animation: blink 1.6s ease-in-out infinite; }
  .motion { right: 10px; background: var(--sicurezza); }
  .foot {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 12px 10px;
    display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; color: #fff;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    font-size: 13px;
  }
  .foot b { font-size: 15px; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .big .foot b { font-size: 18px; }
  @container (max-width: 190px) { .foot .num { display: none; } }
  @keyframes blink { 50% { opacity: 0.35; } }
</style>
