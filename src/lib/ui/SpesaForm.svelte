<script lang="ts">
  // Nuova spesa o modifica, come in Splitwise: descrizione e categoria, importo, data,
  // chi ha pagato, come si divide (a metà, importi esatti, percentuali, quote, tutto all'altro),
  // ripetizione e note. Sotto, in tempo reale, chi deve quanto a chi.
  import { iso, newId } from '../bollette.svelte';
  import {
    altro, CATEGORIE, cent, dividi, METODI, NOMI, ORDINE_CAT, PERSONE, RIPETI, spese,
    type Categoria, type Metodo, type Persona, type Ripeti, type Spesa,
  } from '../spese.svelte';
  import { euro, parseNum } from '../format';
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';

  let { spesa, io, onclose }: { spesa: Spesa | null; io: Persona | null; onclose: () => void } = $props();

  const nuova = !spesa;
  const num = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));
  const cents = (c: number) => (c / 100).toFixed(2).replace('.', ',');
  let descrizione = $state(spesa?.descrizione ?? '');
  let categoria = $state<Categoria>(spesa?.categoria ?? 'altro');
  let sceltaCategoria = !nuova; // finché non la si sceglie, la categoria segue la descrizione
  let importo = $state(num(spesa?.importo));
  let data = $state(spesa?.data ?? iso(Date.now()));
  let pagato = $state<Persona>(spesa?.pagato ?? io ?? 'pietro');
  let metodo = $state<Metodo>(spesa?.metodo ?? 'uguale');
  let valori = $state<Record<Persona, string>>({
    pietro: num(spesa?.valori?.pietro), filippo: num(spesa?.valori?.filippo),
  });
  let ripeti = $state<Ripeti>(spesa?.ripeti ?? '');
  let note = $state(spesa?.note ?? '');
  let busy = $state(false);
  let error = $state('');
  let confirmDelete = $state(false);
  $effect(() => { [descrizione, importo, pagato, metodo, valori.pietro, valori.filippo]; error = ''; });

  // Categoria indovinata dalla descrizione, come fa Splitwise, finché non la si sceglie a mano.
  const INDIZI: [RegExp, Categoria][] = [
    [/affitt|condomin|mutuo|arred|ikea|pulizi/i, 'casa'],
    [/spesa|supermerc|esselunga|coop|conad|lidl|carrefour|eurospin|pam|aldi|mercato|panett/i, 'spesa'],
    [/ristor|pizz|bar\b|caff|aperitiv|cena|pranzo|sushi|kebab|gelat|pub|birr|deliveroo|glovo|just ?eat/i, 'ristoranti'],
    [/luce|gas\b|acqua|tari|internet|fibra|fastweb|tim\b|vodafone|iliad|wind|enel|bollett|telefon/i, 'utenze'],
    [/benzin|diesel|gasolio|carbur|autostr|pedagg|parchegg|treno|bus\b|metro|taxi|uber|auto|tagliando|assicuraz/i, 'trasporti'],
    [/viagg|hotel|albergo|airbnb|volo|aereo|ryanair|vacanz|booking/i, 'viaggi'],
    [/cinema|concert|teatro|netflix|spotify|disney|prime|abbonam|biglietto|gioco|museo/i, 'svago'],
    [/amazon|vestit|scarpe|regalo|elettronic|negozio|acquist|lampadin|ferrament/i, 'acquisti'],
    [/farmac|medic|dottor|dentist|visita|analisi|ottico/i, 'salute'],
    [/crocchett|veterin|gatt|cane|lettiera|petkit|animal/i, 'animali'],
  ];
  $effect(() => {
    if (sceltaCategoria) return;
    categoria = INDIZI.find(([re]) => re.test(descrizione))?.[1] ?? 'altro';
  });
  function scegli(c: Categoria) {
    sceltaCategoria = true;
    categoria = c;
  }

  // Quando si passa a un altro metodo, i campi partono da valori sensati.
  function metodoNuovo(m: Metodo) {
    if (m === metodo) return;
    metodo = m;
    const i = parseNum(importo);
    if (m === 'percentuale') valori = { pietro: '50', filippo: '50' };
    else if (m === 'quote') valori = { pietro: '1', filippo: '1' };
    else if (m === 'esatto') {
      const half = i != null && Number.isFinite(i) ? Math.floor(cent(i) / 2) : null;
      valori = half == null ? { pietro: '', filippo: '' } : { pietro: cents(half), filippo: cents(cent(i!) - half) };
    }
  }
  // Importi esatti: scritto uno, l'altro si completa da solo con il resto.
  function esatto(p: Persona, v: string) {
    valori[p] = v;
    const i = parseNum(importo), x = parseNum(v);
    if (i != null && x != null && Number.isFinite(i) && Number.isFinite(x) && x <= i) valori[altro(p)] = cents(cent(i) - cent(x));
  }
  function percento(p: Persona, v: string) {
    valori[p] = v;
    const x = parseNum(v);
    if (x != null && Number.isFinite(x) && x >= 0 && x <= 100) valori[altro(p)] = num(Math.round((100 - x) * 100) / 100);
  }

  const risultato = $derived.by(() => {
    const i = parseNum(importo);
    if (i == null || !Number.isFinite(i) || i <= 0) return null;
    const v = { pietro: parseNum(valori.pietro) ?? NaN, filippo: parseNum(valori.filippo) ?? NaN };
    return dividi(cent(i), pagato, metodo, v);
  });
  const deve = $derived(typeof risultato === 'object' && risultato ? risultato[altro(pagato)] : 0);
  const nome = (p: Persona) => (p === io ? 'tu' : NOMI[p]);
  const frase = $derived.by(() => {
    if (!risultato || typeof risultato === 'string') return '';
    const o = altro(pagato);
    if (!deve) return `${NOMI[pagato]} paga tutto per sé: nessun debito.`;
    if (o === io) return `Tu devi ${euro(deve / 100)} a ${NOMI[pagato]}.`;
    if (pagato === io) return `${NOMI[o]} ti deve ${euro(deve / 100)}.`;
    return `${NOMI[o]} deve ${euro(deve / 100)} a ${NOMI[pagato]}.`;
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    const i = parseNum(importo);
    if (!descrizione.trim()) return (error = 'Scrivi una descrizione, per esempio «Spesa Esselunga».');
    if (i == null || !Number.isFinite(i) || i <= 0) return (error = "Scrivi l'importo in euro, per esempio 42,50.");
    if (!data) return (error = 'Manca la data.');
    if (!risultato || typeof risultato === 'string') return (error = (risultato as string) || 'Divisione non valida.');
    const v = metodo === 'uguale' || metodo === 'intero' ? null : { pietro: parseNum(valori.pietro) ?? 0, filippo: parseNum(valori.filippo) ?? 0 };
    busy = true;
    try {
      await spese.save({
        id: spesa?.id ?? newId(), tipo: 'spesa', descrizione: descrizione.trim(), categoria, data,
        importo: cent(i) / 100, pagato, parti: { pietro: risultato.pietro / 100, filippo: risultato.filippo / 100 },
        metodo, valori: v, ripeti, note: note.trim(),
      });
      onclose();
    } catch (err: any) {
      error = `Non salvata: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!spesa) return;
    if (!confirmDelete) { confirmDelete = true; return; }
    busy = true;
    try {
      await spese.remove(spesa.id);
      onclose();
    } catch (err: any) {
      error = `Non cancellata: ${err?.message ?? err}`;
    } finally {
      busy = false;
    }
  }
</script>

<Sheet title={nuova ? 'Nuova spesa' : 'Modifica spesa'} subtitle={nuova ? 'Divisa fra Pietro e Filippo' : spesa?.da ? `Ultima modifica: ${spesa.da}` : undefined} {onclose}>
  <form onsubmit={save}>
    <div class="head">
      <span class="ic"><Icon name={CATEGORIE[categoria].icona} size={24} /></span>
      <label class="grow">Descrizione<input bind:value={descrizione} maxlength="100" placeholder="es. Spesa Esselunga" autocomplete="off" required /></label>
    </div>

    <div class="cats" role="radiogroup" aria-label="Categoria">
      {#each ORDINE_CAT as c}
        <button type="button" role="radio" aria-checked={categoria === c} class:sel={categoria === c} onclick={() => scegli(c)}>
          <Icon name={CATEGORIE[c].icona} size={20} /><span>{CATEGORIE[c].nome}</span>
        </button>
      {/each}
    </div>

    <div class="two">
      <label>Importo<span class="in"><input class="big num" bind:value={importo} inputmode="decimal" placeholder="0,00" autocomplete="off" required /><i>€</i></span></label>
      <label>Data<input type="date" bind:value={data} required /></label>
    </div>

    <div class="field">
      <span class="lab">Ha pagato</span>
      <div class="seg" role="radiogroup" aria-label="Ha pagato">
        {#each PERSONE as p}
          <button type="button" role="radio" aria-checked={pagato === p} class:sel={pagato === p} onclick={() => (pagato = p)}>{NOMI[p]}{p === io ? ' (tu)' : ''}</button>
        {/each}
      </div>
    </div>

    <div class="field">
      <span class="lab">Come si divide</span>
      <div class="seg five" role="radiogroup" aria-label="Come si divide">
        {#each METODI as m}
          <button type="button" role="radio" aria-checked={metodo === m.m} class:sel={metodo === m.m} onclick={() => metodoNuovo(m.m)}>{m.nome}</button>
        {/each}
      </div>
      {#if metodo === 'uguale'}
        <p class="hint">Metà ciascuno.</p>
      {:else if metodo === 'intero'}
        <p class="hint">{NOMI[altro(pagato)]} deve tutto l'importo a {NOMI[pagato]} (per esempio una cosa comprata solo per {nome(altro(pagato)) === 'tu' ? 'te' : NOMI[altro(pagato)]}).</p>
      {:else}
        <div class="two">
          {#each PERSONE as p}
            <label>{NOMI[p]}
              <span class="in">
                {#if metodo === 'esatto'}
                  <input value={valori[p]} oninput={(e) => esatto(p, e.currentTarget.value)} inputmode="decimal" placeholder="0,00" autocomplete="off" /><i>€</i>
                {:else if metodo === 'percentuale'}
                  <input value={valori[p]} oninput={(e) => percento(p, e.currentTarget.value)} inputmode="decimal" placeholder="50" autocomplete="off" /><i>%</i>
                {:else}
                  <input bind:value={valori[p]} inputmode="decimal" placeholder="1" autocomplete="off" /><i>{valori[p] === '1' ? 'quota' : 'quote'}</i>
                {/if}
              </span>
            </label>
          {/each}
        </div>
        {#if typeof risultato === 'object' && risultato && metodo !== 'esatto'}
          <p class="hint num">{NOMI.pietro} {euro(risultato.pietro / 100)} · {NOMI.filippo} {euro(risultato.filippo / 100)}</p>
        {/if}
      {/if}
    </div>

    {#if frase}<p class="calc" style:--c="var(--spese)">{frase}</p>
    {:else if typeof risultato === 'string'}<p class="calc warn">{risultato}</p>{/if}

    <div class="two">
      <label>Si ripete
        <select bind:value={ripeti}>
          {#each RIPETI as r}<option value={r.r}>{r.nome}</option>{/each}
        </select>
      </label>
      <span></span>
    </div>
    {#if ripeti}<p class="hint">La stessa spesa si aggiunge da sola alla data giusta. Se la data è nel passato, quelle arretrate si aggiungono subito.</p>{/if}
    <label>Note<textarea bind:value={note} maxlength="500" rows="2" placeholder="facoltative"></textarea></label>

    {#if error}<p class="err" role="alert">{error}</p>{/if}
    <div class="row">
      <button type="button" onclick={onclose}>Annulla</button>
      <button type="submit" class="ok" disabled={busy}>{busy ? 'Salvo…' : 'Salva'}</button>
    </div>
    {#if !nuova}
      <button type="button" class="del" class:ask={confirmDelete} disabled={busy} onclick={remove}>
        {confirmDelete ? 'Tocca di nuovo per cancellarla' : 'Cancella questa spesa'}
      </button>
    {/if}
  </form>
</Sheet>

<style>
  form { display: grid; gap: 14px; }
  .head { display: flex; align-items: flex-end; gap: 12px; }
  .grow { flex: 1; }
  .ic { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--spese); color: #fff; flex: none; }
  .ic :global(.d) { fill-opacity: 0.32; }
  /* Telefono: una riga che scorre col dito, sfumata a destra per far capire che continua.
     Col mouse o su schermo largo: tutte le categorie su più righe, niente da trascinare. */
  .cats {
    display: flex; gap: 6px; overflow-x: auto; margin: 0 -20px; padding: 2px 20px 4px; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 36px), transparent);
  }
  .cats::-webkit-scrollbar { display: none; }
  .cats button {
    flex: none; display: grid; justify-items: center; gap: 4px; width: 76px; min-height: 64px; padding: 8px 4px;
    border: 0; border-radius: 14px; background: var(--track); color: var(--ink-2); font-size: 11.5px; font-weight: 600; line-height: 1.15; cursor: pointer;
  }
  .cats button span { text-align: center; }
  .cats button.sel { background: var(--spese); color: #fff; }
  .cats button.sel :global(.d) { fill-opacity: 0.32; }
  label, .lab { display: grid; gap: 5px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); min-width: 0; }
  .field { display: grid; gap: 6px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  input, textarea, select {
    width: 100%; min-width: 0; min-height: 46px; padding: 0 12px; border-radius: 12px; border: 1.5px solid var(--sep);
    background: var(--tile); color: var(--ink); font: inherit; font-size: 16px; font-weight: 500;
  }
  input.big { font-size: 20px; font-weight: 700; }
  textarea { padding: 10px 12px; resize: vertical; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--spese); }
  .in { display: flex; align-items: center; gap: 8px; }
  .in i { font-style: normal; color: var(--ink-2); font-weight: 600; min-width: 26px; }
  .seg { display: grid; grid-template-columns: 1fr 1fr; background: var(--track); border-radius: 14px; padding: 4px; }
  .seg.five { grid-template-columns: repeat(5, 1fr); }
  .seg button { min-height: 44px; padding: 0 4px; border: 0; border-radius: 10px; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  .hint { font-size: 13px; color: var(--ink-2); }
  .calc { font-size: 15px; font-weight: 700; padding: 12px 14px; border-radius: 12px; background: color-mix(in srgb, var(--spese) 14%, var(--raised)); color: var(--ink); }
  .calc.warn { background: color-mix(in srgb, var(--luci) 16%, var(--raised)); font-weight: 600; font-size: 14px; }
  .err { color: var(--pericolo); font-weight: 600; font-size: 14px; }
  .row { display: flex; gap: 8px; }
  .row button { flex: 1; min-height: 48px; border: 0; border-radius: 14px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 16px; cursor: pointer; }
  .row .ok { background: var(--spese); color: #fff; }
  .row .ok:disabled { opacity: 0.6; }
  .del { min-height: 44px; border: 0; border-radius: 14px; background: none; color: var(--pericolo); font-weight: 600; cursor: pointer; }
  .del.ask { background: var(--pericolo); color: #fff; }
  @media (min-width: 720px), (hover: hover) and (pointer: fine) {
    .cats {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); overflow: visible;
      margin: 0; padding: 0; -webkit-mask-image: none; mask-image: none;
    }
    .cats button { width: auto; }
  }
</style>
