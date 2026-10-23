<script lang="ts">
  // Spese in comune fra Pietro e Filippo, come Splitwise (richiesta di Pietro, 23/10):
  // saldo di chi deve a chi con «Salda», elenco mese per mese con ricerca, totali per periodo,
  // per persona e per categoria, grafico degli ultimi 12 mesi, esportazione CSV.
  // Tutto dall'archivio del CT 203 (vedi lib/spese.svelte.ts).
  import { hass } from '../lib/ha/hass.svelte';
  import { meseDi, sposta } from '../lib/bollette.svelte';
  import {
    altro, CATEGORIE, cent, csv, effetto, NOMI, ORDINE_CAT, PERSONE, personaDi, saldo, spese,
    type Categoria, type Persona, type Spesa,
  } from '../lib/spese.svelte';
  import { euro } from '../lib/format';
  import Icon from '../lib/ui/Icon.svelte';
  import BarChart from '../lib/ui/BarChart.svelte';
  import SpesaForm from '../lib/ui/SpesaForm.svelte';
  import RimborsoForm from '../lib/ui/RimborsoForm.svelte';

  $effect(() => {
    if (hass.status === 'ready' && spese.status === 'idle') spese.load();
  });
  // Le spese le cambia anche l'altro: si rileggono quando la pagina torna in primo piano.
  $effect(() => {
    const vis = () => { if (document.visibilityState === 'visible') spese.refresh(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  });

  // Chi sta guardando: dal nome dell'utente di HA. Nel mockup si guarda come Pietro.
  const io = $derived<Persona | null>(hass.demo ? 'pietro' : personaDi(hass.user));

  let vista = $state<'elenco' | 'totali'>('elenco');
  let editing = $state<Spesa | null | undefined>(undefined); // undefined = chiuso, null = nuova
  let salda = $state<{ x: Spesa | null } | null>(null);

  // --- Saldo ---
  const s = $derived(saldo(spese.list));
  const creditore = $derived<Persona>(s.pietro >= 0 ? 'pietro' : 'filippo');
  const debitore = $derived(altro(creditore));
  const dovuto = $derived(Math.abs(s.pietro));
  const fraseSaldo = $derived.by(() => {
    if (!dovuto) return 'Siete pari';
    if (debitore === io) return `Devi ${euro(dovuto / 100)} a ${NOMI[creditore]}`;
    if (creditore === io) return `${NOMI[debitore]} ti deve ${euro(dovuto / 100)}`;
    return `${NOMI[debitore]} deve ${euro(dovuto / 100)} a ${NOMI[creditore]}`;
  });
  const soloSpese = $derived(spese.list.filter((x) => x.tipo === 'spesa'));
  const pagatoDa = (p: Persona, list: Spesa[]) => list.filter((x) => x.pagato === p).reduce((a, x) => a + cent(x.importo), 0);
  const quotaDi = (p: Persona, list: Spesa[]) => list.reduce((a, x) => a + cent(x.parti[p] ?? 0), 0);

  // --- Elenco ---
  let cerca = $state('');
  let quante = $state(60);
  const day = (d: string) => new Date(`${d}T12:00:00`);
  const monthLabel = (k: string, year = true) =>
    new Date(`${k}-15T12:00:00`).toLocaleDateString('it-IT', { month: year ? 'long' : 'short', ...(year ? { year: 'numeric' } : {}) }).replace('.', '');
  const trovate = $derived.by(() => {
    const q = cerca.trim().toLowerCase();
    const list = [...spese.list].sort((a, b) => b.data.localeCompare(a.data) || (b.modificata ?? '').localeCompare(a.modificata ?? ''));
    if (!q) return list;
    return list.filter((x) =>
      [x.descrizione, x.note, x.tipo === 'rimborso' ? 'rimborso salda' : CATEGORIE[x.categoria].nome, NOMI[x.pagato], String(x.importo).replace('.', ',')]
        .some((t) => t.toLowerCase().includes(q)));
  });
  const mesi = $derived.by(() => {
    const by = new Map<string, Spesa[]>();
    for (const x of trovate.slice(0, quante)) by.set(x.data.slice(0, 7), [...(by.get(x.data.slice(0, 7)) ?? []), x]);
    return [...by.entries()].map(([k, list]) => ({ k, list, tot: list.filter((x) => x.tipo === 'spesa').reduce((a, x) => a + cent(x.importo), 0) }));
  });

  /** Colonna di destra di una riga: dal punto di vista di chi guarda, o di chi ha pagato. */
  function lato(x: Spesa): { label: string; c: number; cls: string } {
    if (x.tipo === 'rimborso') return { label: 'rimborso', c: cent(x.importo), cls: 'pay' };
    const v = io ?? x.pagato;
    const e = effetto(x, v);
    if (!e) return { label: 'nessun debito', c: 0, cls: 'zero' };
    if (io) return e > 0 ? { label: 'hai prestato', c: e, cls: 'lent' } : { label: 'devi', c: -e, cls: 'owe' };
    return { label: `${NOMI[v]} ha prestato`, c: e, cls: 'lent' };
  }
  const chiHaPagato = (x: Spesa) =>
    x.tipo === 'rimborso'
      ? `${x.pagato === io ? 'Hai' : `${NOMI[x.pagato]} ha`} dato ${euro(x.importo)} a ${altro(x.pagato) === io ? 'te' : NOMI[altro(x.pagato)]}`
      : `${x.pagato === io ? 'Hai' : `${NOMI[x.pagato]} ha`} pagato ${euro(x.importo)}`;

  function apri(x: Spesa) {
    if (x.tipo === 'rimborso') salda = { x };
    else editing = x;
  }

  function esporta() {
    const blob = new Blob([csv(spese.list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `spese-pietro-filippo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // --- Totali ---
  type Periodo = 'mese' | 'scorso' | 'anno' | 'sempre';
  let periodo = $state<Periodo>('mese');
  const ora = meseDi(Date.now());
  const nelPeriodo = $derived(
    soloSpese.filter((x) => {
      const k = x.data.slice(0, 7);
      if (periodo === 'mese') return k === ora;
      if (periodo === 'scorso') return k === sposta(ora, -1);
      if (periodo === 'anno') return k.slice(0, 4) === ora.slice(0, 4);
      return true;
    }),
  );
  const totale = $derived(nelPeriodo.reduce((a, x) => a + cent(x.importo), 0));
  const perCategoria = $derived(
    ORDINE_CAT.map((c) => ({ c, v: nelPeriodo.filter((x) => x.categoria === c).reduce((a, x) => a + cent(x.importo), 0) }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v),
  );
  const nomePeriodo = $derived(
    periodo === 'mese' ? monthLabel(ora) : periodo === 'scorso' ? monthLabel(sposta(ora, -1)) : periodo === 'anno' ? `Anno ${ora.slice(0, 4)}` : 'Da sempre',
  );

  let filtroCat = $state<Categoria | ''>('');
  let di = $state<'' | Persona>('');
  const serie = $derived.by(() =>
    Array.from({ length: 12 }, (_, i) => {
      const k = sposta(ora, i - 11);
      const list = soloSpese.filter((x) => x.data.startsWith(k) && (!filtroCat || x.categoria === filtroCat));
      const v = di ? quotaDi(di, list) : list.reduce((a, x) => a + cent(x.importo), 0);
      return { label: monthLabel(k, false), v: v / 100, now: i === 11 };
    }),
  );
</script>

<header class="top">
  <div>
    <h1>Spese</h1>
    <p class="sub">{NOMI.pietro} e {NOMI.filippo}</p>
  </div>
  <div class="acts">
    <button class="btn neutral" disabled={spese.status !== 'ready'} onclick={() => (salda = { x: null })}><Icon name="scambia" size={20} />Salda</button>
    <button class="btn primary" disabled={spese.status !== 'ready'} onclick={() => (editing = null)}><Icon name="piu" size={20} />Aggiungi spesa</button>
  </div>
</header>

{#if spese.status === 'error'}
  <p class="card errbox" role="alert">Spese non disponibili: {spese.error}</p>
{:else if spese.status !== 'ready'}
  <p class="empty">Carico le spese…</p>
{:else}
  <section class="card bal" class:pari={!dovuto}>
    <span class="disc"><Icon name={dovuto ? 'spese' : 'ok'} size={30} /></span>
    <div class="bt">
      <p class="label">Saldo</p>
      <p class="val num">{fraseSaldo}</p>
      {#if spese.list.length}
        <p class="sub2 num">In tutto: {NOMI.pietro} ha pagato {euro(pagatoDa('pietro', soloSpese) / 100)}, {NOMI.filippo} {euro(pagatoDa('filippo', soloSpese) / 100)}</p>
      {/if}
    </div>
    {#if dovuto}
      <button class="btn settle" onclick={() => (salda = { x: null })}>Salda {euro(dovuto / 100)}</button>
    {/if}
  </section>

  <div class="seg" role="tablist" aria-label="Vista">
    <button role="tab" aria-selected={vista === 'elenco'} class:sel={vista === 'elenco'} onclick={() => (vista = 'elenco')}>Elenco</button>
    <button role="tab" aria-selected={vista === 'totali'} class:sel={vista === 'totali'} onclick={() => (vista = 'totali')}>Totali</button>
  </div>

  {#if vista === 'elenco'}
    {#if !spese.list.length}
      <section class="card first">
        <Icon name="spese" size={36} />
        <p><b>Nessuna spesa ancora.</b></p>
        <p class="sub2">Aggiungi una spesa: chi ha pagato, quanto, e come dividerla. Il saldo di chi deve a chi si aggiorna da solo, e con «Salda» registri i soldi restituiti.</p>
        <button class="btn primary" onclick={() => (editing = null)}><Icon name="piu" size={20} />Aggiungi la prima</button>
      </section>
    {:else}
      <div class="tools">
        <label class="search"><Icon name="cerca" size={20} /><input type="search" bind:value={cerca} placeholder="Cerca fra le spese" aria-label="Cerca fra le spese" /></label>
        <button class="round" onclick={esporta} aria-label="Esporta in CSV" title="Esporta in CSV (Excel)"><Icon name="esporta" size={20} /></button>
      </div>
      {#if !trovate.length}<p class="empty">Nessuna spesa trovata.</p>{/if}
      {#each mesi as m (m.k)}
        <section class="card month">
          <div class="mh"><h2>{monthLabel(m.k).replace(/^./, (c) => c.toUpperCase())}</h2>{#if m.tot}<span class="num">{euro(m.tot / 100)}</span>{/if}</div>
          <ul>
            {#each m.list as x (x.id)}
              {@const r = lato(x)}
              <li>
                <button onclick={() => apri(x)}>
                  <span class="date"><small>{day(x.data).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}</small><b class="num">{day(x.data).getDate()}</b></span>
                  <span class="ic" class:pay={x.tipo === 'rimborso'}><Icon name={x.tipo === 'rimborso' ? 'scambia' : CATEGORIE[x.categoria].icona} size={22} /></span>
                  <span class="what">
                    <b>{x.tipo === 'rimborso' ? 'Rimborso' : x.descrizione}{#if x.ripeti}<span class="rep" title="Si ripete"><Icon name="riavvio" size={14} /></span>{/if}</b>
                    <small>{chiHaPagato(x)}</small>
                    {#if x.note}<small class="note">{x.note}</small>{/if}
                  </span>
                  <span class="amt {r.cls}"><small>{r.label}</small>{#if r.c}<b class="num">{euro(r.c / 100)}</b>{/if}</span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
      {#if trovate.length > quante}
        <button class="btn neutral more" onclick={() => (quante += 60)}>Mostra altre ({trovate.length - quante})</button>
      {/if}
    {/if}
  {:else}
    <div class="seg small" role="radiogroup" aria-label="Periodo">
      {#each [['mese', 'Questo mese'], ['scorso', 'Mese scorso'], ['anno', "Quest'anno"], ['sempre', 'Sempre']] as [p, l]}
        <button role="radio" aria-checked={periodo === p} class:sel={periodo === p} onclick={() => (periodo = p as Periodo)}>{l}</button>
      {/each}
    </div>
    <div class="layout">
      <section class="card">
        <p class="label">{nomePeriodo.replace(/^./, (c) => c.toUpperCase())} · spesa totale</p>
        <p class="big num">{euro(totale / 100)}</p>
        <dl>
          {#each PERSONE as p}
            <div><dt>{NOMI[p]}{p === io ? ' (tu)' : ''} ha pagato</dt><dd class="num">{euro(pagatoDa(p, nelPeriodo) / 100)}</dd></div>
            <div><dt>Parte di {NOMI[p]}</dt><dd class="num">{euro(quotaDi(p, nelPeriodo) / 100)}</dd></div>
          {/each}
        </dl>
      </section>

      <section class="card">
        <h2>Per categoria</h2>
        {#if perCategoria.length}
          <ul class="cats">
            {#each perCategoria as r (r.c)}
              <li>
                <span class="ic"><Icon name={CATEGORIE[r.c].icona} size={20} /></span>
                <span class="what"><b>{CATEGORIE[r.c].nome}</b><span class="bar"><i style:width="{(r.v / perCategoria[0].v) * 100}%"></i></span></span>
                <span class="amt"><b class="num">{euro(r.v / 100)}</b><small class="num">{Math.round((r.v / totale) * 100)}%</small></span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty">Nessuna spesa in questo periodo.</p>
        {/if}
      </section>

      <section class="card wide">
        <h2>Ultimi 12 mesi</h2>
        <div class="controls">
          <select bind:value={filtroCat} aria-label="Categoria">
            <option value="">Tutte le categorie</option>
            {#each ORDINE_CAT as c}<option value={c}>{CATEGORIE[c].nome}</option>{/each}
          </select>
          <select bind:value={di} aria-label="Di chi">
            <option value="">Spesa totale</option>
            {#each PERSONE as p}<option value={p}>Parte di {NOMI[p]}</option>{/each}
          </select>
        </div>
        {#if serie.some((b) => b.v > 0)}
          <BarChart label="Spese mese per mese" bars={serie} color="var(--spese)" height={170} every={2} format={(v) => `${Math.round(v)} €`} />
        {:else}
          <p class="empty">Nessun dato per questa scelta.</p>
        {/if}
      </section>
    </div>
  {/if}
{/if}

{#if editing !== undefined}<SpesaForm spesa={editing} {io} onclose={() => (editing = undefined)} />{/if}
{#if salda}<RimborsoForm rimborso={salda.x} da={debitore} importo={dovuto / 100} {io} onclose={() => (salda = null)} />{/if}

<style>
  .top { margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
  .sub { color: var(--ink-2); margin-top: 4px; font-size: 15px; }
  .sub2 { color: var(--ink-2); font-size: 13.5px; margin-top: 4px; line-height: 1.45; }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 16px 0 12px; border: 0; border-radius: 22px; font-weight: 600; font-size: 15px; cursor: pointer; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn.primary { background: var(--spese); color: #fff; }
  .btn.neutral { background: var(--tile); color: var(--ink); }
  .btn.settle { background: var(--ok); color: #fff; padding: 0 18px; }
  .card { background: var(--tile); border-radius: var(--r-card); padding: 18px; }
  .errbox { color: var(--pericolo); font-weight: 600; font-size: 14px; }
  .empty { color: var(--ink-3); font-size: 14px; padding: 18px 0; text-align: center; }
  .label { color: var(--ink-2); font-size: 14.5px; }

  .bal { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .bt { flex: 1; min-width: 200px; }
  .disc { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: var(--spese); color: #fff; flex: none; }
  .disc :global(.d) { fill-opacity: 0.32; }
  .bal.pari .disc { background: var(--ok); }
  .val { font-size: 28px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.15; color: var(--spese); margin-top: 2px; }
  .bal.pari .val { color: var(--ink); }

  .seg { display: flex; background: var(--track); border-radius: 14px; padding: 4px; margin-bottom: 16px; width: fit-content; max-width: 100%; }
  .seg button { min-height: 40px; padding: 0 18px; border: 0; border-radius: 10px; background: none; font-weight: 600; font-size: 15px; cursor: pointer; color: var(--ink-2); white-space: nowrap; }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  .seg.small { display: grid; grid-template-columns: repeat(4, 1fr); width: min(100%, 560px); }
  .seg.small button { padding: 4px 6px; font-size: 13.5px; line-height: 1.15; white-space: normal; }

  .first { display: grid; gap: 8px; justify-items: start; }
  .first :global(svg) { color: var(--ink-3); }
  .tools { display: flex; gap: 8px; margin-bottom: 16px; }
  .search { flex: 1; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 14px; border-radius: 16px; background: var(--tile); color: var(--ink-3); }
  .search input { flex: 1; min-width: 0; border: 0; background: none; color: var(--ink); font: inherit; font-size: 16px; outline: none; }
  .round { width: 48px; height: 48px; flex: none; border: 0; border-radius: 50%; background: var(--tile); color: var(--ink-2); display: grid; place-items: center; cursor: pointer; }

  .month { margin-bottom: 16px; padding-bottom: 8px; }
  .mh { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px; }
  .mh span { color: var(--ink-2); font-weight: 600; font-size: 14px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--sep); }
  li > button { width: 100%; display: grid; grid-template-columns: 34px 44px 1fr auto; gap: 10px; align-items: center; padding: 10px 0; border: 0; background: none; text-align: left; cursor: pointer; color: inherit; }
  .date { display: grid; justify-items: center; line-height: 1.05; color: var(--ink-2); }
  .date small { font-size: 11.5px; text-transform: lowercase; }
  .date b { font-size: 18px; font-weight: 700; color: var(--ink); }
  .ic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--spese) 16%, transparent); color: var(--spese); }
  .ic.pay { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }
  .what { min-width: 0; }
  .what b { display: flex; align-items: center; gap: 5px; font-weight: 600; font-size: 15.5px; overflow-wrap: anywhere; }
  .rep { color: var(--ink-3); display: inline-flex; }
  .what small { display: block; font-size: 13px; color: var(--ink-2); overflow-wrap: anywhere; }
  .what small.note { font-style: italic; }
  .amt { display: grid; justify-items: end; text-align: right; line-height: 1.2; }
  .amt small { font-size: 12px; color: var(--ink-2); }
  .amt b { font-size: 16px; font-weight: 700; }
  .amt.lent b, .amt.lent small { color: var(--ok); }
  .amt.owe b, .amt.owe small { color: var(--caldo); }
  .amt.zero small { color: var(--ink-3); }
  .more { width: 100%; }

  .layout { display: grid; gap: 16px; }
  .big { font-size: 40px; font-weight: 700; letter-spacing: -0.035em; color: var(--spese); margin-top: 4px; }
  dl { margin: 10px 0 0; }
  dl div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--sep); font-size: 14px; }
  dt { color: var(--ink-2); }
  dd { margin: 0; font-weight: 600; text-align: right; }
  .cats { margin-top: 8px; }
  .cats li { display: grid; grid-template-columns: 40px 1fr auto; gap: 10px; align-items: center; padding: 9px 0; }
  .cats .ic { width: 40px; height: 40px; }
  .cats .what b { font-size: 14.5px; }
  .bar { display: block; height: 5px; border-radius: 3px; background: var(--track); margin-top: 6px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--spese); border-radius: 3px; transition: width 0.6s var(--ease); }
  .cats .amt { min-width: 96px; }
  .cats .amt small { font-size: 12.5px; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
  select { min-height: 48px; padding: 0 12px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font: inherit; font-size: 14px; font-weight: 600; }

  @media (min-width: 720px) { h1 { font-size: 40px; } .val { font-size: 32px; } }
  @media (min-width: 1000px) { .layout { grid-template-columns: 1fr 1fr; align-items: start; } .wide { grid-column: 1 / -1; } }
</style>
