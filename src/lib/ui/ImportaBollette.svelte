<script lang="ts">
  // Importa un file di bollette (.json): prima l'elenco di cosa contiene, con le già presenti
  // e le non valide messe da parte; poi «Importa N bollette» le salva una alla volta.
  import { bollette, leggiImport, TIPI, type DaImportare } from '../bollette.svelte';
  import { euro } from '../format';
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';

  let { file, onclose }: { file: File; onclose: () => void } = $props();

  let testo = '';
  let righe = $state<DaImportare[]>([]);
  let error = $state('');
  let busy = $state(false);
  let fatte = $state(-1); // -1 = non ancora importate

  const leggi = () => {
    try { righe = leggiImport(testo, bollette.list); } catch (e: any) { error = `File non letto: ${e?.message ?? e}`; }
  };
  if (file.size > 1_000_000) error = 'File non letto: è troppo grande per essere un elenco di bollette.';
  else file.text().then((t) => { testo = t; leggi(); }).catch((e) => (error = `File non letto: ${e?.message ?? e}`));

  const nuove = $derived(righe.filter((r) => r.stato === 'nuova'));
  const presenti = $derived(righe.filter((r) => r.stato === 'presente').length);
  const errate = $derived(righe.filter((r) => r.stato === 'errata').length);
  const ordinate = $derived(righe.map((r, i) => ({ ...r, i })).sort((a, b) =>
    a.stato === 'errata' || b.stato === 'errata' ? a.i - b.i : a.b.dal.localeCompare(b.b.dal) || a.b.tipo.localeCompare(b.b.tipo)));

  const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  const qty = (r: DaImportare) => (r.b.consumo ? ` · ${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(r.b.consumo)} ${TIPI[r.b.tipo].unita}` : '');

  async function importa() {
    busy = true;
    error = '';
    let n = 0;
    try {
      for (const r of nuove) { await bollette.save(r.b); n++; }
      fatte = n;
    } catch (e: any) {
      // Si ferma al primo errore (di solito l'archivio non risponde): le già salvate restano,
      // e rileggendo il file diventano «già presenti», così «Riprova» importa solo le altre.
      error = `Importate ${n} di ${nuove.length}, poi: ${e?.message ?? e}`;
      leggi();
    } finally {
      busy = false;
    }
  }
</script>

<Sheet title="Importa bollette" subtitle={file.name} {onclose}>
  {#if fatte >= 0}
    <p class="done"><Icon name="ok" size={22} />Importate {fatte} {fatte === 1 ? 'bolletta' : 'bollette'}.</p>
    <button class="wide" onclick={onclose}>Fatto</button>
  {:else}
    {#if righe.length}
      <p class="sum">
        {righe.length} nel file: <b>{nuove.length} {nuove.length === 1 ? 'nuova' : 'nuove'}</b>{#if presenti}, {presenti} già {presenti === 1 ? 'presente' : 'presenti'}{/if}{#if errate}, {errate} non {errate === 1 ? 'valida' : 'valide'}{/if}.
        {#if presenti}Le già presenti (stesso tipo, periodo e importo) si saltano.{/if}
      </p>
      <ul>
        {#each ordinate as r (r.i)}
          <li class:skip={r.stato !== 'nuova'}>
            {#if r.stato === 'errata'}
              <span class="ic err"><Icon name="avviso" size={18} /></span>
              <span class="what"><b>Riga {r.i + 1}</b><small>Non valida: {r.motivo}</small></span>
            {:else}
              <span class="ic" style:--c={TIPI[r.b.tipo].colore}><Icon name={TIPI[r.b.tipo].icona} size={18} /></span>
              <span class="what"><b>{TIPI[r.b.tipo].nome}{r.b.fornitore ? ` · ${r.b.fornitore}` : ''}</b>
                <small>{day(r.b.dal)} – {day(r.b.al)}{qty(r)}{r.stato === 'presente' ? ' · già presente' : r.b.pagata ? '' : ' · da pagare'}</small></span>
              <span class="amt num">{euro(r.b.importo)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {:else if !error}
      <p class="sum">Leggo il file…</p>
    {/if}

    {#if error}<p class="err" role="alert">{error}</p>{/if}
    <div class="row">
      <button onclick={onclose}>Annulla</button>
      {#if nuove.length}
        <button class="ok" disabled={busy} onclick={importa}>
          {busy ? 'Importo…' : error ? 'Riprova' : `Importa ${nuove.length} ${nuove.length === 1 ? 'bolletta' : 'bollette'}`}
        </button>
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .sum { font-size: 14px; color: var(--ink-2); line-height: 1.45; }
  .sum b { color: var(--ink); }
  ul { list-style: none; margin: 10px 0 14px; padding: 0; }
  li { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center; padding: 8px 0; }
  li + li { border-top: 1px solid var(--sep); }
  li.skip { opacity: 0.5; }
  .ic { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--c); color: #fff; }
  .ic :global(.d) { fill-opacity: 0.32; }
  .ic.err { background: var(--pericolo); }
  .what { min-width: 0; }
  .what b { display: block; font-weight: 600; font-size: 14.5px; overflow-wrap: anywhere; }
  .what small { display: block; font-size: 12.5px; color: var(--ink-2); overflow-wrap: anywhere; }
  .amt { font-weight: 700; font-size: 15px; text-align: right; }
  .err { color: var(--pericolo); font-weight: 600; font-size: 14px; margin-bottom: 10px; }
  .done { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 16px; margin-bottom: 14px; }
  .done :global(svg) { color: var(--ok); }
  .row { display: flex; gap: 8px; }
  .row button, .wide { flex: 1; min-height: 48px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 16px; cursor: pointer; }
  .row .ok, .wide { background: var(--energia); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .wide { width: 100%; }
</style>
