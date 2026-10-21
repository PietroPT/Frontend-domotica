<script lang="ts">
  // Schermata prima dei dati: collegamento in corso oppure il motivo per cui non va,
  // con un solo pulsante per riprovare (che, se serve, riporta al login di HA).
  import { hass, HA_URL } from '../ha/hass.svelte';
  import { start } from '../ha/live';
  import Icon from './Icon.svelte';
</script>

<main class="gate" aria-live="polite">
  <div class="box">
    <span class="logo" class:bad={hass.status === 'error'}><Icon name="ha" size={34} /></span>
    {#if hass.status === 'error'}
      <h1>Non riesco a collegarmi</h1>
      <p>{hass.error}</p>
      <button class="btn" onclick={start}><Icon name="riavvio" size={22} />Riprova</button>
      <p class="addr num">{HA_URL}</p>
    {:else}
      <h1>Collegamento a Home Assistant…</h1>
      <p>Se è la prima volta su questo dispositivo, si apre la pagina di accesso di Home Assistant.</p>
    {/if}
  </div>
</main>

<style>
  .gate { min-height: 100dvh; display: grid; place-items: center; padding: 24px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left)); }
  .box { max-width: 420px; display: grid; justify-items: center; gap: 14px; text-align: center; }
  .logo { width: 72px; height: 72px; border-radius: 22px; display: grid; place-items: center; background: var(--rack); color: #fff; }
  .logo.bad { background: var(--pericolo); }
  .logo :global(.d) { fill-opacity: 0.32; }
  h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; text-wrap: balance; }
  p { color: var(--ink-2); font-size: 15.5px; line-height: 1.45; }
  .btn { display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 22px 0 18px; margin-top: 6px; border: 0; border-radius: 26px; background: var(--ink); color: var(--bg); font-weight: 600; font-size: 16px; cursor: pointer; }
  .addr { font-size: 13px; color: var(--ink-3); }
</style>
