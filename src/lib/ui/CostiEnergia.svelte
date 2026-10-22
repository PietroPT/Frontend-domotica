<script lang="ts">
  // Costi delle prese misurate: kWh delle statistiche di HA × prezzo al kWh.
  // Il prezzo è un aiutante di HA (input_number.costo_energia), uguale su tutti i dispositivi;
  // lo cambia solo un amministratore. È il prezzo di oggi applicato anche ai giorni passati.
  import { hass } from '../ha/hass.svelte';
  import { loadEnergyMonths, monthStart, price, setPrice, type EnergyMonths } from '../ha/energy';
  import { euro, kwh, perKwh } from '../format';
  import { nameOf, switchOf } from '../view';
  import Icon from './Icon.svelte';

  let { ids, today }: { ids: string[]; today: number } = $props();

  const p = $derived(price());

  // Mesi: si ricaricano quando cambiano le prese e ogni ora.
  let months = $state<EnergyMonths | null>(null);
  let hour = $state(new Date().getHours());
  $effect(() => {
    const i = setInterval(() => (hour = new Date().getHours()), 60_000);
    return () => clearInterval(i);
  });
  const idsKey = $derived([...ids].sort().join(','));
  $effect(() => {
    hour;
    loadEnergyMonths(idsKey ? idsKey.split(',') : []).then((m) => (months = m)).catch(() => (months = null));
  });

  const sum = (r?: Record<string, number>) => (r && Object.keys(r).length ? Object.values(r).reduce((a, v) => a + v, 0) : NaN);
  const monthKwh = $derived(sum(months?.thisMonth));
  const lastKwh = $derived(sum(months?.lastMonth));
  // Stima a fine mese in proporzione ai giorni passati; prima del terzo giorno sarebbe un numero a caso.
  const elapsed = $derived((Date.now() - monthStart(0)) / 86_400_000);
  const daysInMonth = $derived(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
  const forecast = $derived(elapsed >= 3 ? (monthKwh / elapsed) * daysInMonth : NaN);
  const monthName = (back: number) => {
    const s = new Date(monthStart(back)).toLocaleDateString('it-IT', { month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const perPlug = $derived(
    Object.entries(months?.thisMonth ?? {})
      .map(([id, k]) => ({ id, k, name: nameOf(switchOf(id) ?? hass.states[id]) }))
      .filter((r) => r.k > 0)
      .sort((a, b) => b.k - a.k),
  );

  // Modifica del prezzo
  let editing = $state(false);
  let value = $state('');
  let busy = $state(false);
  let error = $state('');
  let input = $state<HTMLInputElement>();
  $effect(() => { if (editing) input?.select(); });
  function start() {
    value = Number.isFinite(p) ? String(p).replace('.', ',') : '';
    error = '';
    editing = true;
  }
  async function save(e: SubmitEvent) {
    e.preventDefault();
    const v = parseFloat(value.replace(/[€\s]/g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0 || v > 2) {
      error = 'Scrivi il prezzo in euro per kWh, per esempio 0,25.';
      return;
    }
    busy = true;
    error = '';
    try {
      await setPrice(Math.round(v * 10_000) / 10_000);
      editing = false;
    } catch (err: any) {
      error = err?.code === 'unauthorized'
        ? 'Solo un amministratore di Home Assistant può impostare il prezzo.'
        : `Prezzo non salvato: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

<section class="card costi">
  <h2>Costi</h2>
  <p class="sub2">Delle prese misurate, al prezzo dell'energia che inserisci</p>

  {#if editing}
    <form class="edit" onsubmit={save}>
      <label for="prezzo">Prezzo dell'energia, in € per kWh</label>
      <div class="in">
        <input id="prezzo" bind:this={input} bind:value inputmode="decimal" autocomplete="off" placeholder="0,25"
          onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); editing = false; } }} />
        <span>€/kWh</span>
      </div>
      <div class="row">
        <button type="button" onclick={() => (editing = false)}>Annulla</button>
        <button type="submit" class="ok" disabled={busy}>{busy ? 'Salvo…' : 'Salva'}</button>
      </div>
      <p class="hint" class:err={!!error} role={error ? 'alert' : undefined}>
        {error || "Usa quanto costa un kWh in più: dalla bolletta, la quota per consumi più le accise, più l'IVA, divisa per i kWh. Non il totale diviso i kWh: dentro ci sono quota fissa e quota potenza, che si pagano anche consumando zero. Si salva in Home Assistant e vale per tutti i dispositivi."}
      </p>
    </form>
  {:else}
    <div class="price">
      <span class="lab">Prezzo</span>
      <b class="num">{Number.isFinite(p) ? perKwh(p) : 'non impostato'}</b>
      {#if hass.admin}
        <button class="mod" onclick={start} aria-label={Number.isFinite(p) ? 'Cambia il prezzo dell\'energia' : 'Imposta il prezzo dell\'energia'}>
          <Icon name="matita" size={18} />{Number.isFinite(p) ? 'Cambia' : 'Imposta'}
        </button>
      {/if}
    </div>
  {/if}

  {#if !Number.isFinite(p)}
    <p class="empty">{hass.admin ? 'Imposta il prezzo per vedere quanto costano i consumi.' : 'Il prezzo non è ancora impostato: lo inserisce un amministratore di Home Assistant.'}</p>
  {:else}
    <div class="stats">
      <div>
        <p class="lab">Oggi</p>
        <p class="val num">{euro(today * p)}</p>
        <p class="lab num">{kwh(today)}</p>
      </div>
      <div>
        <p class="lab">{monthName(0)}, finora</p>
        <p class="val num">{euro(monthKwh * p)}</p>
        <p class="lab num">{kwh(monthKwh)}{#if Number.isFinite(forecast)}{` · a fine mese circa ${euro(forecast * p)}`}{/if}</p>
      </div>
      <div>
        <p class="lab">{monthName(1)}</p>
        <p class="val num">{euro(lastKwh * p)}</p>
        <p class="lab num">{kwh(lastKwh)}</p>
      </div>
    </div>

    {#if perPlug.length}
      <h3>{monthName(0)}, presa per presa</h3>
      <ul>
        {#each perPlug as r (r.id)}
          <li><span class="n">{r.name}</span><span class="k num">{kwh(r.k)}</span><b class="num">{euro(r.k * p)}</b></li>
        {/each}
      </ul>
    {/if}
    <p class="note">Solo le prese con misura dei consumi, non tutta la casa. Il prezzo di oggi vale anche per i giorni passati; i mesi sono aggiornati all'ultima ora completa.</p>
  {/if}
</section>

<style>
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  h3 { font-size: 15px; font-weight: 600; margin: 18px 0 4px; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 12px; }
  .lab { color: var(--ink-2); font-size: 14px; }
  .price { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 6px 0 14px; border-radius: 14px; background: var(--track); }
  .price b { margin-left: auto; font-weight: 600; font-size: 16px; }
  .mod { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border: 0; border-radius: 12px; background: var(--raised); color: var(--ink); font-weight: 600; font-size: 14px; cursor: pointer; }
  .mod :global(svg) { color: var(--ink-3); }
  .edit { display: grid; gap: 8px; }
  .edit label { font-size: 14px; font-weight: 600; }
  .in { display: flex; align-items: center; gap: 10px; }
  .in span { color: var(--ink-2); font-weight: 600; }
  input {
    flex: 1; min-width: 0; min-height: 48px; padding: 0 14px; border-radius: 14px; border: 2px solid var(--energia);
    background: var(--tile); color: var(--ink); font: inherit; font-size: 18px; font-weight: 600;
  }
  input:focus { outline: none; }
  .row { display: flex; gap: 8px; }
  .row button { flex: 1; min-height: 44px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 15px; cursor: pointer; }
  .row .ok { background: var(--energia); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .hint { font-size: 13px; color: var(--ink-2); line-height: 1.45; }
  .hint.err { color: var(--pericolo); font-weight: 600; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 16px; }
  .stats > div { min-width: 0; }
  .val { font-size: 30px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.15; color: var(--energia); }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: baseline; padding: 10px 0; }
  li + li { border-top: 1px solid var(--sep); }
  .n { min-width: 0; overflow-wrap: anywhere; font-weight: 500; }
  .k { color: var(--ink-2); font-size: 14px; }
  li b { font-weight: 700; min-width: 64px; text-align: right; }
  .note { font-size: 13px; color: var(--ink-2); margin-top: 12px; line-height: 1.45; }
  .empty { color: var(--ink-3); font-size: 14px; padding: 18px 0 4px; }
</style>
