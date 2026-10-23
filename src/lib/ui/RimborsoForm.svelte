<script lang="ts">
  // «Salda», come in Splitwise: soldi dati da uno all'altro (contanti, bonifico, Satispay).
  // Si apre già con chi deve, a chi e quanto; si può cambiare tutto, anche un rimborso parziale.
  import { iso, newId } from '../bollette.svelte';
  import { altro, cent, NOMI, spese, type Persona, type Spesa } from '../spese.svelte';
  import { euro, parseNum } from '../format';
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';

  let { rimborso, da: daIniziale, importo: importoIniziale, io, onclose }:
    { rimborso: Spesa | null; da: Persona; importo: number; io: Persona | null; onclose: () => void } = $props();

  const nuovo = !rimborso;
  let da = $state<Persona>(rimborso?.pagato ?? daIniziale);
  let importo = $state(String(rimborso?.importo ?? (importoIniziale || '')).replace('.', ','));
  let data = $state(rimborso?.data ?? iso(Date.now()));
  let note = $state(rimborso?.note ?? '');
  let busy = $state(false);
  let error = $state('');
  let confirmDelete = $state(false);
  const chi = (p: Persona) => (p === io ? 'Tu' : NOMI[p]);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    const i = parseNum(importo);
    if (i == null || !Number.isFinite(i) || i <= 0) return (error = "Scrivi l'importo in euro, per esempio 42,50.");
    busy = true;
    try {
      const c = cent(i) / 100;
      await spese.save({
        id: rimborso?.id ?? newId(), tipo: 'rimborso', descrizione: '', categoria: 'altro', data, importo: c, pagato: da,
        parti: { [altro(da)]: c, [da]: 0 } as Record<Persona, number>, metodo: 'intero', valori: null, ripeti: '', note: note.trim(),
      });
      onclose();
    } catch (err: any) {
      error = `Non salvato: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!rimborso) return;
    if (!confirmDelete) { confirmDelete = true; return; }
    busy = true;
    try {
      await spese.remove(rimborso.id);
      onclose();
    } catch (err: any) {
      error = `Non cancellato: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

<Sheet title={nuovo ? 'Salda' : 'Rimborso'} subtitle={nuovo ? 'Registra i soldi dati da uno all’altro' : undefined} {onclose}>
  <form onsubmit={save}>
    <div class="who">
      <div class="p"><span class="av">{NOMI[da][0]}</span><b>{chi(da)}</b><small>dà</small></div>
      <button type="button" class="swap" onclick={() => (da = altro(da))} aria-label="Inverti chi dà e chi riceve"><Icon name="scambia" size={22} /></button>
      <div class="p"><span class="av to">{NOMI[altro(da)][0]}</span><b>{chi(altro(da))}</b><small>riceve</small></div>
    </div>

    <label>Importo<span class="in"><input class="big num" bind:value={importo} inputmode="decimal" placeholder="0,00" autocomplete="off" required /><i>€</i></span></label>
    {#if nuovo && importoIniziale > 0 && parseNum(importo) !== importoIniziale}
      <button type="button" class="tutto" onclick={() => (importo = String(importoIniziale).replace('.', ','))}>Tutto il debito: {euro(importoIniziale)}</button>
    {/if}
    <div class="two">
      <label>Data<input type="date" bind:value={data} required /></label>
      <label>Note<input bind:value={note} maxlength="500" placeholder="es. bonifico" autocomplete="off" /></label>
    </div>

    {#if error}<p class="err" role="alert">{error}</p>{/if}
    <div class="row">
      <button type="button" onclick={onclose}>Annulla</button>
      <button type="submit" class="ok" disabled={busy}>{busy ? 'Salvo…' : nuovo ? 'Registra' : 'Salva'}</button>
    </div>
    {#if !nuovo}
      <button type="button" class="del" class:ask={confirmDelete} disabled={busy} onclick={remove}>
        {confirmDelete ? 'Tocca di nuovo per cancellarlo' : 'Cancella questo rimborso'}
      </button>
    {/if}
  </form>
</Sheet>

<style>
  form { display: grid; gap: 14px; }
  .who { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 6px 0 4px; }
  .p { display: grid; justify-items: center; gap: 2px; }
  .p b { font-size: 16px; }
  .p small { color: var(--ink-2); font-size: 13px; }
  .av { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; background: var(--track); color: var(--ink); font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .av.to { background: var(--spese); color: #fff; }
  .swap { width: 48px; height: 48px; border-radius: 50%; border: 0; background: var(--track); color: var(--ink-2); display: grid; place-items: center; cursor: pointer; }
  label { display: grid; gap: 5px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); min-width: 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  input {
    width: 100%; min-width: 0; min-height: 46px; padding: 0 12px; border-radius: 12px; border: 1.5px solid var(--sep);
    background: var(--tile); color: var(--ink); font: inherit; font-size: 16px; font-weight: 500;
  }
  input.big { font-size: 24px; font-weight: 700; min-height: 54px; }
  input:focus { outline: none; border-color: var(--spese); }
  .in { display: flex; align-items: center; gap: 8px; }
  .in i { font-style: normal; color: var(--ink-2); font-weight: 600; min-width: 26px; }
  .tutto { justify-self: start; min-height: 40px; padding: 0 14px; border: 0; border-radius: 20px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 14px; cursor: pointer; margin-top: -6px; }
  .err { color: var(--pericolo); font-weight: 600; font-size: 14px; }
  .row { display: flex; gap: 8px; }
  .row button { flex: 1; min-height: 48px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 16px; cursor: pointer; }
  .row .ok { background: var(--ok); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .del { min-height: 44px; border: 0; border-radius: 14px; background: none; color: var(--pericolo); font-weight: 600; cursor: pointer; }
  .del.ask { background: var(--pericolo); color: #fff; }
</style>
