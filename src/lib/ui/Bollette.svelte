<script lang="ts">
  // Bollette: scadenze, riepilogo per tipo, andamento mese per mese ed elenco.
  // I mesi spalmano ogni bolletta sui giorni del suo periodo (vedi perMese).
  import { hass } from '../ha/hass.svelte';
  import { bollette, costoUnitario, meseDi, ORDINE, perMese, somma, sposta, TIPI, type Bolletta, type Tipo } from '../bollette.svelte';
  import { euro, perKwh } from '../format';
  import BarChart from './BarChart.svelte';
  import BollettaForm from './BollettaForm.svelte';
  import Icon from './Icon.svelte';

  $effect(() => {
    if (hass.status === 'ready' && bollette.status === 'idle') bollette.load();
  });

  let editing = $state<Bolletta | null | undefined>(undefined); // undefined = chiuso, null = nuova
  const can = $derived(bollette.admin);

  const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  const monthLabel = (k: string, year = true) =>
    new Date(`${k}-15T12:00:00`).toLocaleDateString('it-IT', { month: year ? 'long' : 'short', ...(year ? { year: 'numeric' } : {}) }).replace('.', '');
  const qty = (v: number, t: Tipo) => `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: v < 100 ? 1 : 0 }).format(v)} ${TIPI[t].unita}`;
  const unitPrice = (v: number, t: Tipo) => (t === 'luce' ? perKwh(v) : `${new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(v)} €/${TIPI[t].unita}`);

  // Scadenze: non pagate, dalla più vicina.
  const todayKey = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const daPagare = $derived(bollette.list.filter((b) => !b.pagata).sort((a, b) => (a.scadenza ?? '9999').localeCompare(b.scadenza ?? '9999')));
  const tra = (d: string) => Math.round((new Date(`${d}T12:00:00`).getTime() - new Date(`${todayKey}T12:00:00`).getTime()) / 86_400_000);
  let paying = $state('');
  async function segnaPagata(b: Bolletta) {
    paying = b.id;
    try { await bollette.save({ ...b, pagata: true }); } catch (e: any) { hass.say(`Non salvata: ${e?.message ?? e}`); } finally { paying = ''; }
  }

  // Riepilogo per tipo: i 12 mesi fino all'ultimo mese coperto da bollette di quel tipo,
  // confrontati con i 12 prima (solo se anche quelli sono coperti quasi tutti).
  const riepilogo = $derived(
    ORDINE.map((t) => {
      const list = bollette.list.filter((b) => b.tipo === t);
      if (!list.length) return null;
      const mesi = perMese(list);
      const fine = meseDi(new Date(`${list.reduce((a, b) => (b.al > a ? b.al : a), '')}T12:00:00`).getTime());
      const ora = somma(mesi, sposta(fine, -11), fine);
      const prima = somma(mesi, sposta(fine, -23), sposta(fine, -12));
      const conConsumo = perMese(list.filter((b) => b.consumo));
      const cc = somma(conConsumo, sposta(fine, -11), fine);
      return {
        t, fine, euro: ora.euro, consumo: ora.consumo, mesi: ora.coperti,
        unitario: cc.consumo > 0 ? cc.euro / cc.consumo : NaN,
        delta: prima.coperti >= 10 && ora.coperti >= 10 && prima.euro > 0 ? (ora.euro - prima.euro) / prima.euro : NaN,
      };
    }).filter((r) => r !== null),
  );

  // Andamento: ultimi 24 mesi, per tutte o per un tipo, in € o consumo.
  let filtro = $state<Tipo | ''>('');
  let unita = $state<'euro' | 'consumo'>('euro');
  const consumoOk = $derived(filtro !== '' && filtro !== 'tari');
  const serie = $derived.by(() => {
    const list = bollette.list.filter((b) => !filtro || b.tipo === filtro);
    if (!list.length) return [];
    const mesi = perMese(list);
    // Fino all'ultimo mese coperto, ma non oltre il mese in corso (la TARI copre l'anno intero).
    const ultimo = meseDi(new Date(`${list.reduce((a, b) => (b.al > a ? b.al : a), '')}T12:00:00`).getTime());
    const fine = ultimo < meseDi(Date.now()) ? ultimo : meseDi(Date.now());
    return Array.from({ length: 24 }, (_, i) => {
      const k = sposta(fine, i - 23);
      const m = mesi.get(k);
      return { k, label: monthLabel(k, false), v: (consumoOk && unita === 'consumo' ? m?.consumo : m?.euro) ?? 0, now: i === 23 };
    });
  });
  const fmtAxis = (v: number) => (consumoOk && unita === 'consumo' ? String(Math.round(v)) : `${Math.round(v)} €`);

  // Elenco per anno (anno di fine periodo), dal più recente.
  const anni = $derived.by(() => {
    const by = new Map<string, Bolletta[]>();
    for (const b of [...bollette.list].sort((a, b) => b.al.localeCompare(a.al) || a.tipo.localeCompare(b.tipo))) {
      const y = b.al.slice(0, 4);
      by.set(y, [...(by.get(y) ?? []), b]);
    }
    return [...by.entries()].map(([y, list]) => ({ y, list, tot: list.reduce((a, b) => a + b.importo, 0) }));
  });
</script>

<div class="bollette">
  <header class="bh">
    <div>
      <h2>Bollette</h2>
      <p class="sub2">Luce, gas, acqua e TARI, inserite a mano. Restano nel CT 203 per anni, uguali su tutti i dispositivi.</p>
    </div>
    {#if can}<button class="add" onclick={() => (editing = null)}><Icon name="piu" size={20} />Aggiungi</button>{/if}
  </header>

  {#if bollette.status === 'error'}
    <p class="card errbox" role="alert">Bollette non disponibili: {bollette.error}</p>
  {:else if bollette.status !== 'ready'}
    <p class="empty">Carico le bollette…</p>
  {:else if !bollette.list.length}
    <section class="card first">
      <Icon name="bolletta" size={34} />
      <p><b>Nessuna bolletta ancora.</b></p>
      <p class="sub2">Per ognuna servono il periodo, il consumo (kWh per la luce, Smc per il gas, m³ per l'acqua) e l'importo totale: li trovi nella prima pagina della bolletta. Con due anni di bollette vedi anche il confronto con l'anno prima.</p>
      {#if can}<button class="add" onclick={() => (editing = null)}><Icon name="piu" size={20} />Aggiungi la prima</button>
      {:else}<p class="sub2">Le inserisce un amministratore di Home Assistant.</p>{/if}
    </section>
  {:else}
    {#if daPagare.length}
      <section class="card">
        <h3>Da pagare</h3>
        <ul class="list">
          {#each daPagare as b (b.id)}
            {@const n = b.scadenza ? tra(b.scadenza) : NaN}
            <li>
              <span class="ic" style:--c={TIPI[b.tipo].colore}><Icon name={TIPI[b.tipo].icona} size={20} /></span>
              <span class="what"><b>{TIPI[b.tipo].nome}{b.fornitore ? ` · ${b.fornitore}` : ''}</b>
                <small class:late={n < 0} class:soon={n >= 0 && n <= 7}>
                  {#if !b.scadenza}Senza scadenza{:else if n < 0}Scaduta da {-n} {-n === 1 ? 'giorno' : 'giorni'} ({day(b.scadenza)}){:else if n === 0}Scade oggi{:else}Scade tra {n} {n === 1 ? 'giorno' : 'giorni'} ({day(b.scadenza)}){/if}
                </small></span>
              <span class="right"><span class="amt num">{euro(b.importo)}</span>
                {#if can}<button class="pay" disabled={paying === b.id} onclick={() => segnaPagata(b)}>Pagata</button>{/if}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <div class="sum">
      {#each riepilogo as r (r.t)}
        <section class="card tipo">
          <div class="th"><span class="ic" style:--c={TIPI[r.t].colore}><Icon name={TIPI[r.t].icona} size={20} /></span><h3>{TIPI[r.t].nome}</h3></div>
          <p class="big num">{euro(r.euro)}</p>
          <p class="sub2">{r.mesi >= 12 ? '12 mesi' : `${r.mesi} ${r.mesi === 1 ? 'mese' : 'mesi'}`} fino a {monthLabel(r.fine)} · {euro(r.euro / Math.max(r.mesi, 1))} al mese</p>
          <dl>
            {#if r.t !== 'tari' && r.consumo > 0}<div><dt>Consumo</dt><dd class="num">{qty(r.consumo, r.t)}</dd></div>{/if}
            {#if Number.isFinite(r.unitario)}<div><dt>Costo medio</dt><dd class="num">{unitPrice(r.unitario, r.t)}</dd></div>{/if}
            {#if Number.isFinite(r.delta)}
              <div><dt>Rispetto ai 12 mesi prima</dt><dd class="num" class:up={r.delta > 0.02} class:down={r.delta < -0.02}>{r.delta > 0 ? '+' : ''}{Math.round(r.delta * 100)}%</dd></div>
            {/if}
          </dl>
        </section>
      {/each}
    </div>

    <section class="card">
      <h3>Mese per mese</h3>
      <p class="sub2">Ultimi 24 mesi; ogni bolletta è divisa sui mesi del suo periodo</p>
      <div class="controls">
        <select bind:value={filtro} aria-label="Tipo" onchange={() => { if (!consumoOk) unita = 'euro'; }}>
          <option value="">Tutte</option>
          {#each ORDINE as t}<option value={t}>{TIPI[t].nome}</option>{/each}
        </select>
        {#if consumoOk}
          <div class="seg" role="radiogroup" aria-label="Unità">
            <button role="radio" aria-checked={unita === 'euro'} class:sel={unita === 'euro'} onclick={() => (unita = 'euro')}>€</button>
            <button role="radio" aria-checked={unita === 'consumo'} class:sel={unita === 'consumo'} onclick={() => (unita = 'consumo')}>{TIPI[filtro as Tipo].unita}</button>
          </div>
        {/if}
      </div>
      {#if serie.some((s) => s.v > 0)}
        <BarChart label="Spesa delle bollette mese per mese" bars={serie} format={fmtAxis} height={170} every={3}
          color={filtro ? TIPI[filtro].colore : 'var(--energia)'} />
      {:else}
        <p class="empty">Nessun dato per questa scelta.</p>
      {/if}
    </section>

    <section class="card">
      <h3>Tutte le bollette</h3>
      {#each anni as a (a.y)}
        <div class="yh"><b>{a.y}</b><span class="num">{euro(a.tot)}</span></div>
        <ul class="list">
          {#each a.list as b (b.id)}
            {@const cu = costoUnitario(b)}
            <li>
              <span class="ic" style:--c={TIPI[b.tipo].colore}><Icon name={TIPI[b.tipo].icona} size={20} /></span>
              <span class="what"><b>{TIPI[b.tipo].nome}{b.fornitore ? ` · ${b.fornitore}` : ''}</b>
                <small>{day(b.dal)} – {day(b.al)}{b.consumo ? ` · ${qty(b.consumo, b.tipo)}` : ''}{Number.isFinite(cu) ? ` · ${unitPrice(cu, b.tipo)}` : ''}{b.pagata ? '' : ' · da pagare'}</small>
                {#if b.note}<small class="note">{b.note}</small>{/if}</span>
              <span class="amt num">{euro(b.importo)}</span>
              {#if can}<button class="edit" onclick={() => (editing = b)} aria-label="Modifica la bolletta {TIPI[b.tipo].nome} {day(b.dal)} – {day(b.al)}"><Icon name="matita" size={18} /></button>{/if}
            </li>
          {/each}
        </ul>
      {/each}
    </section>
  {/if}
</div>

{#if editing !== undefined}<BollettaForm bolletta={editing} onclose={() => (editing = undefined)} />{/if}

<style>
  .bollette { display: grid; gap: 16px; }
  .bh { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  h3 { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin-top: 3px; line-height: 1.45; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  .add { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px 0 12px; border: 0; border-radius: 22px; background: var(--energia); color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; }
  .first { display: grid; gap: 8px; justify-items: start; }
  .first :global(svg) { color: var(--ink-3); }
  .errbox { color: var(--pericolo); font-weight: 600; font-size: 14px; }
  .empty { color: var(--ink-3); font-size: 14px; padding: 18px 0; text-align: center; }
  .list { list-style: none; margin: 8px 0 0; padding: 0; }
  .list li { display: grid; grid-template-columns: 40px 1fr auto auto; gap: 10px; align-items: center; padding: 10px 0; }
  .list li + li { border-top: 1px solid var(--sep); }
  .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--c); color: #fff; }
  .ic :global(.d) { fill-opacity: 0.32; }
  .what { min-width: 0; }
  .what b { display: block; font-weight: 600; font-size: 15px; overflow-wrap: anywhere; }
  .what small { display: block; font-size: 13px; color: var(--ink-2); overflow-wrap: anywhere; }
  .what small.note { font-style: italic; }
  .what small.late { color: var(--pericolo); font-weight: 600; }
  .what small.soon { color: var(--caldo); font-weight: 600; }
  .amt { font-weight: 700; font-size: 16px; text-align: right; }
  .right { display: grid; gap: 6px; justify-items: end; }
  .pay { min-height: 40px; padding: 0 12px; border: 0; border-radius: 12px; background: var(--ok); color: #fff; font-weight: 600; cursor: pointer; }
  .pay:disabled { opacity: 0.6; }
  .edit { width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--track); color: var(--ink-2); display: grid; place-items: center; cursor: pointer; }
  .sum { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
  .th { display: flex; align-items: center; gap: 10px; }
  .big { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; margin-top: 10px; }
  dl { margin: 10px 0 0; }
  dl div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--sep); font-size: 14px; }
  dt { color: var(--ink-2); }
  dd { margin: 0; font-weight: 600; text-align: right; }
  dd.up { color: var(--pericolo); }
  dd.down { color: var(--ok); }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  select { min-height: 48px; padding: 0 12px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font: inherit; font-size: 14px; font-weight: 600; }
  .seg { display: flex; background: var(--track); border-radius: 14px; padding: 4px; }
  .seg button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 10px; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  .yh { display: flex; justify-content: space-between; margin-top: 16px; padding-bottom: 4px; border-bottom: 2px solid var(--sep); font-size: 15px; }
  .yh span { font-weight: 700; }
</style>
