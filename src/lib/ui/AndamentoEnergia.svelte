<script lang="ts">
  // Andamento dei consumi nel tempo, in kWh o in euro, per tutte le prese o per una sola.
  // I dati sono le statistiche a lungo termine di Home Assistant (vedi loadEnergyTrend).
  import { hass } from '../ha/hass.svelte';
  import { loadEnergyTrend, price, type TrendBucket, type TrendRange } from '../ha/energy';
  import { euro, kwh } from '../format';
  import { nameOf, switchOf } from '../view';
  import BarChart from './BarChart.svelte';

  let { ids }: { ids: string[] } = $props();

  let range = $state<TrendRange>('giorni');
  let unit = $state<'kwh' | 'eur'>('kwh');
  let plug = $state(''); // '' = tutte le prese

  const p = $derived(price());
  const euros = $derived(unit === 'eur' && Number.isFinite(p));

  let data = $state<TrendBucket[] | null>(null);
  let failed = $state(false);
  let hour = $state(new Date().getHours());
  $effect(() => {
    const i = setInterval(() => (hour = new Date().getHours()), 60_000);
    return () => clearInterval(i);
  });
  const idsKey = $derived([...ids].sort().join(','));
  $effect(() => {
    hour;
    const r = range;
    loadEnergyTrend(idsKey ? idsKey.split(',') : [], r)
      .then((d) => { if (r === range) { data = d; failed = false; } })
      .catch(() => (failed = true));
  });

  const plugs = $derived(ids.map((id) => ({ id, name: nameOf(switchOf(id) ?? hass.states[id]) })).sort((a, b) => a.name.localeCompare(b.name, 'it')));

  const label = (t: number) => {
    const d = new Date(t);
    if (range === 'giorni') return String(d.getDate());
    if (range === 'mesi') return d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
    return String(d.getFullYear());
  };
  const longLabel = (t: number) => {
    const d = new Date(t);
    if (range === 'giorni') return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    if (range === 'mesi') return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return String(d.getFullYear());
  };
  const bars = $derived(
    (data ?? []).map((b, i, all) => {
      const k = plug ? (b.byPower[plug] ?? 0) : Object.values(b.byPower).reduce((a, v) => a + v, 0);
      return { t: b.t, label: label(b.t), v: euros ? k * p : k, now: i === all.length - 1 };
    }),
  );
  const fmtAxis = (v: number) => {
    const n = v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v));
    return euros ? `${n} €` : n;
  };
  const show = (v: number) => (euros ? euro(v) : kwh(v));
  const total = $derived(bars.reduce((a, b) => a + b.v, 0));
  const top = $derived(bars.length ? bars.reduce((a, b) => (b.v > a.v ? b : a)) : null);
  const per = $derived(range === 'giorni' ? 'giorno' : range === 'mesi' ? 'mese' : 'anno');
  // Media sui periodi completi (si esclude quello in corso, ancora a metà).
  const avg = $derived(bars.length > 1 ? bars.slice(0, -1).reduce((a, b) => a + b.v, 0) / (bars.length - 1) : NaN);
  const empty = $derived(!!data && total <= 0);
</script>

<section class="card trend">
  <h2>Andamento</h2>
  <p class="sub2">Consumi delle prese misurate nel tempo. I dati restano in Home Assistant, anche per anni.</p>

  <div class="controls">
    <div class="seg" role="radiogroup" aria-label="Periodo">
      {#each [['giorni', '30 giorni'], ['mesi', '12 mesi'], ['anni', 'Anni']] as [r, t]}
        <button role="radio" aria-checked={range === r} class:sel={range === r} onclick={() => (range = r as TrendRange)}>{t}</button>
      {/each}
    </div>
    <div class="seg unit" role="radiogroup" aria-label="Unità">
      <button role="radio" aria-checked={unit === 'kwh'} class:sel={unit === 'kwh'} onclick={() => (unit = 'kwh')}>kWh</button>
      <button role="radio" aria-checked={unit === 'eur'} class:sel={unit === 'eur'} onclick={() => (unit = 'eur')}>€</button>
    </div>
    <select bind:value={plug} aria-label="Presa">
      <option value="">Tutte le prese</option>
      {#each plugs as pl (pl.id)}<option value={pl.id}>{pl.name}</option>{/each}
    </select>
  </div>

  {#if unit === 'eur' && !Number.isFinite(p)}
    <p class="hint">Per vedere gli euro serve il prezzo dell'energia: si imposta nella sezione Costi. Intanto i valori sono in kWh.</p>
  {/if}

  {#if failed}
    <p class="empty">Statistiche di Home Assistant non disponibili.</p>
  {:else if !data}
    <p class="empty">Carico…</p>
  {:else if empty}
    <p class="empty">Nessun consumo registrato in questo periodo.</p>
  {:else}
    <BarChart label="Andamento dei consumi" bars={bars} format={fmtAxis} height={180} every={range === 'giorni' ? 5 : range === 'mesi' ? 2 : 1} />
    <dl>
      <div><dt>Totale</dt><dd class="num">{show(total)}</dd></div>
      {#if Number.isFinite(avg)}<div><dt>Media per {per} ({range === 'giorni' ? 'senza oggi' : range === 'mesi' ? 'senza il mese in corso' : "senza l'anno in corso"})</dt><dd class="num">{show(avg)}</dd></div>{/if}
      {#if top}<div><dt>Il più alto</dt><dd class="num">{longLabel(top.t)} · {show(top.v)}</dd></div>{/if}
    </dl>
    {#if euros}<p class="note">In euro con il prezzo di oggi ({String(p).replace('.', ',')} €/kWh), anche per i periodi passati.</p>{/if}
  {/if}
</section>

<style>
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 12px; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .seg { display: flex; background: var(--track); border-radius: 14px; padding: 4px; }
  .seg button { min-height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  select {
    min-height: 48px; padding: 0 12px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink);
    font: inherit; font-size: 14px; font-weight: 600; max-width: 100%;
  }
  .hint { font-size: 13px; color: var(--ink-2); margin-bottom: 10px; }
  .empty { color: var(--ink-3); font-size: 14px; padding: 24px 0; text-align: center; }
  dl { margin: 12px 0 0; display: grid; }
  dl div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--sep); font-size: 14.5px; }
  dt { color: var(--ink-2); }
  dd { margin: 0; font-weight: 600; text-align: right; }
  .note { font-size: 13px; color: var(--ink-2); margin-top: 10px; }
</style>
