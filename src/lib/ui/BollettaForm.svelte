<script lang="ts">
  // Inserimento e modifica di una bolletta, in un foglio. Campi nell'ordine della bolletta:
  // tipo, fornitore, periodo, consumo, importo, scadenza, pagata, note.
  import { bollette, costoUnitario, giorni, newId, ORDINE, TIPI, type Bolletta, type Tipo } from '../bollette.svelte';
  import { setPrice } from '../ha/energy';
  import { euro, perKwh } from '../format';
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';

  let { bolletta, onclose }: { bolletta: Bolletta | null; onclose: () => void } = $props();

  const nuova = !bolletta;
  const num = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));
  let tipo = $state<Tipo>(bolletta?.tipo ?? 'luce');
  let fornitore = $state(bolletta?.fornitore ?? '');
  let dal = $state(bolletta?.dal ?? '');
  let al = $state(bolletta?.al ?? '');
  let consumo = $state(num(bolletta?.consumo));
  let importo = $state(num(bolletta?.importo));
  let scadenza = $state(bolletta?.scadenza ?? '');
  let pagata = $state(bolletta?.pagata ?? false);
  let note = $state(bolletta?.note ?? '');
  let usaPrezzo = $state(false);
  let busy = $state(false);
  let error = $state('');
  let confirmDelete = $state(false);
  // L'avviso di un errore sparisce appena si corregge qualcosa.
  $effect(() => { [tipo, dal, al, consumo, importo]; error = ''; });

  // Numeri all'italiana: «1.234,56» e «148,30»; anche «148.30» se manca la virgola. Vuoto = null.
  function parseNum(s: string): number | null {
    const t = s.replace(/[€\s]/g, '');
    if (!t) return null;
    return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  }
  const u = $derived(TIPI[tipo].unita);
  const anteprima = $derived.by(() => {
    const i = parseNum(importo), c = tipo === 'tari' ? null : parseNum(consumo);
    if (!dal || !al || al < dal || i == null || !Number.isFinite(i)) return null;
    const n = giorni({ dal, al });
    const b = { importo: i, consumo: c } as Bolletta;
    return { n, unit: costoUnitario(b), mese: (i / n) * 30.44 };
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    const i = parseNum(importo), c = tipo === 'tari' ? null : parseNum(consumo);
    if (!dal || !al) return (error = 'Indica inizio e fine del periodo.');
    if (al < dal) return (error = "La fine del periodo viene prima dell'inizio.");
    if (i == null || !Number.isFinite(i) || i < 0) return (error = "Scrivi l'importo in euro, per esempio 148,30.");
    if (c != null && (!Number.isFinite(c) || c < 0)) return (error = `Scrivi il consumo in ${u}, per esempio 520.`);
    busy = true;
    try {
      await bollette.save({
        id: bolletta?.id ?? newId(), tipo, fornitore: fornitore.trim(), dal, al, consumo: c, importo: i,
        scadenza: scadenza || null, pagata, note: note.trim(),
      });
      if (usaPrezzo && anteprima && Number.isFinite(anteprima.unit)) await setPrice(Math.round(anteprima.unit * 10_000) / 10_000);
      onclose();
    } catch (err: any) {
      error = `Non salvata: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!bolletta) return;
    if (!confirmDelete) { confirmDelete = true; return; }
    busy = true;
    try {
      await bollette.remove(bolletta.id);
      onclose();
    } catch (err: any) {
      error = `Non cancellata: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

<Sheet title={nuova ? 'Nuova bolletta' : `Bolletta ${TIPI[tipo].nome.toLowerCase()}`} subtitle={nuova ? 'I dati si salvano nel CT 203 e li vedono tutti i dispositivi' : undefined} {onclose}>
  <form onsubmit={save}>
    <div class="seg" role="radiogroup" aria-label="Tipo">
      {#each ORDINE as t}
        <button type="button" role="radio" aria-checked={tipo === t} class:sel={tipo === t} onclick={() => (tipo = t)}>
          <Icon name={TIPI[t].icona} size={18} />{TIPI[t].nome}
        </button>
      {/each}
    </div>

    <label>Fornitore<input bind:value={fornitore} maxlength="80" placeholder={tipo === 'tari' ? 'Comune' : 'es. Enel Energia'} autocomplete="off" /></label>
    <div class="two">
      <label>{tipo === 'tari' ? 'Anno o periodo, dal' : 'Periodo di consumo, dal'}<input type="date" bind:value={dal} required /></label>
      <label>al<input type="date" bind:value={al} required /></label>
    </div>
    <div class="two">
      {#if tipo !== 'tari'}
        <label>Consumo<span class="in"><input bind:value={consumo} inputmode="decimal" placeholder="0" autocomplete="off" /><i>{u}</i></span></label>
      {/if}
      <label>Importo totale<span class="in"><input bind:value={importo} inputmode="decimal" placeholder="0,00" autocomplete="off" required /><i>€</i></span></label>
    </div>
    {#if tipo === 'gas'}<p class="hint">Il gas in bolletta è in Smc (metri cubi standard), non nei m³ letti sul contatore.</p>{/if}
    <div class="two">
      <label>Scadenza<input type="date" bind:value={scadenza} /></label>
      <label class="check"><input type="checkbox" bind:checked={pagata} />Pagata</label>
    </div>
    <label>Note<textarea bind:value={note} maxlength="500" rows="2" placeholder="es. conguaglio, lettura stimata"></textarea></label>

    {#if anteprima}
      <p class="calc">
        {anteprima.n} giorni · circa {euro(anteprima.mese)} al mese{#if Number.isFinite(anteprima.unit)}{` · ${tipo === 'luce' ? perKwh(anteprima.unit) : `${euro(anteprima.unit)}/${u}`}`}{/if}
      </p>
      {#if tipo === 'luce' && Number.isFinite(anteprima.unit)}
        <label class="check"><input type="checkbox" bind:checked={usaPrezzo} />Usa questo prezzo al kWh nella sezione Costi delle prese</label>
      {/if}
    {/if}

    {#if error}<p class="err" role="alert">{error}</p>{/if}
    <div class="row">
      <button type="button" onclick={onclose}>Annulla</button>
      <button type="submit" class="ok" disabled={busy}>{busy ? 'Salvo…' : 'Salva'}</button>
    </div>
    {#if !nuova}
      <button type="button" class="del" class:ask={confirmDelete} disabled={busy} onclick={remove}>
        {confirmDelete ? 'Tocca di nuovo per cancellarla' : 'Cancella questa bolletta'}
      </button>
    {/if}
  </form>
</Sheet>

<style>
  form { display: grid; gap: 12px; }
  .seg { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--track); border-radius: 14px; padding: 4px; }
  .seg button { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 52px; border: 0; border-radius: 10px; background: none; font-weight: 600; font-size: 13px; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  label { display: grid; gap: 5px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); min-width: 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  input, textarea {
    width: 100%; min-width: 0; min-height: 46px; padding: 0 12px; border-radius: 12px; border: 1.5px solid var(--sep);
    background: var(--tile); color: var(--ink); font: inherit; font-size: 16px; font-weight: 500;
  }
  textarea { padding: 10px 12px; resize: vertical; }
  input:focus, textarea:focus { outline: none; border-color: var(--energia); }
  .in { display: flex; align-items: center; gap: 8px; }
  .in i { font-style: normal; color: var(--ink-2); font-weight: 600; min-width: 26px; }
  .check { display: flex; align-items: center; gap: 10px; min-height: 46px; align-self: end; color: var(--ink); font-size: 15px; }
  .check input { width: 22px; min-height: 22px; height: 22px; accent-color: var(--energia); flex: none; }
  .hint { font-size: 13px; color: var(--ink-2); margin-top: -4px; }
  .calc { font-size: 14px; font-weight: 600; padding: 10px 12px; border-radius: 12px; background: var(--track); }
  .err { color: var(--pericolo); font-weight: 600; font-size: 14px; }
  .row { display: flex; gap: 8px; }
  .row button { flex: 1; min-height: 48px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 16px; cursor: pointer; }
  .row .ok { background: var(--energia); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .del { min-height: 44px; border: 0; border-radius: 14px; background: none; color: var(--pericolo); font-weight: 600; cursor: pointer; }
  .del.ask { background: var(--pericolo); color: #fff; }
</style>
