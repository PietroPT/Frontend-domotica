<script lang="ts">
  // Cibo extra dal distributore PetKit. L'integrazione eroga quando si scrive la quantità
  // in text.crocchette_alimentazione_manuale (valori ammessi: 10, 20, 30, 40, 50 g).
  // Due tocchi (riquadro, poi «Eroga») e il pulsante resta fermo qualche secondo:
  // così un doppio tocco non fa uscire due porzioni.
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import Sheet from '../lib/ui/Sheet.svelte';
  import Icon from '../lib/ui/Icon.svelte';

  let { id }: { id: string } = $props();
  const CANCEL = 'button.crocchette_annulla_alimentazione_manuale';
  const st = (e: string) => hass.states[e]?.state;

  const amounts = [10, 20, 30, 40, 50];
  let grams = $state(10);
  let sent = $state(false);

  const low = $derived(st('binary_sensor.crocchette_livello_cibo') === 'on');
  const today = $derived(st('sensor.crocchette_totale_erogato'));
  const planned = $derived(st('sensor.crocchette_totale_programmato'));
  const manual = $derived(st('sensor.crocchette_erogato_manualmente'));

  async function feed() {
    sent = true;
    const ok = await hass.callService('text', 'set_value', { entity_id: id, value: String(grams) });
    setTimeout(() => (sent = false), ok ? 8000 : 0);
  }
</script>

{#if hass.states[id]}
  <Sheet title="Cibo extra" subtitle="Distributore crocchette" roomId={id} onclose={() => app.close()}>
    <div class="body">
      <dl class="rows">
        <div><dt>Livello cibo</dt><dd class:warn={low}>{low ? 'In esaurimento' : st('binary_sensor.crocchette_livello_cibo') === 'off' ? 'Sufficiente' : '—'}</dd></div>
        {#if today}<div><dt>Erogato oggi</dt><dd class="num">{today} g{planned ? ` · programmati ${planned} g` : ''}</dd></div>{/if}
        {#if manual}<div><dt>Di cui extra</dt><dd class="num">{manual} g</dd></div>{/if}
      </dl>

      <div class="seg" role="radiogroup" aria-label="Quantità">
        {#each amounts as g}
          <button role="radio" aria-checked={grams === g} class:sel={grams === g} onclick={() => (grams = g)}><span class="num">{g}</span> g</button>
        {/each}
      </div>

      <button class="btn primary" onclick={feed} disabled={sent}>
        <Icon name="crocchette" size={22} />{sent ? 'Comando inviato' : `Eroga ${grams} g`}
      </button>
      {#if hass.states[CANCEL]}
        <button class="btn" onclick={() => hass.callService('button', 'press', { entity_id: CANCEL })}>Annulla erogazione</button>
      {/if}
      <p class="note">Le porzioni programmate (colazione, pranzo, cena) non cambiano.</p>
    </div>
  </Sheet>
{/if}

<style>
  .body { display: grid; gap: 14px; }
  .rows { margin: 0; }
  .rows div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--sep); font-size: 15px; }
  .rows div:first-child { border-top: 0; }
  .rows dt { color: var(--ink-2); }
  .rows dd { margin: 0; font-weight: 600; }
  .rows dd.warn { color: var(--pericolo); }
  .seg { display: flex; background: var(--track); border-radius: 14px; padding: 4px; }
  .seg button { flex: 1; min-height: 48px; border: 0; border-radius: 10px; background: none; font-weight: 600; font-size: 15px; cursor: pointer; color: var(--ink-2); }
  .seg button.sel { background: var(--raised); color: var(--ink); box-shadow: var(--shadow); }
  .btn { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 56px; border: 0; border-radius: 18px; background: var(--track); color: var(--ink); font-weight: 600; font-size: 16px; cursor: pointer; }
  .btn.primary { background: var(--clima); color: #fff; }
  .btn:disabled { opacity: 0.6; cursor: default; }
  .note { font-size: 13px; color: var(--ink-2); }
</style>
