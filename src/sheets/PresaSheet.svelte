<script lang="ts">
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { policyOf } from '../lib/policy';
  import { watt, since } from '../lib/format';
  import { powerOf, switchOf } from '../lib/view';
  import Sheet from '../lib/ui/Sheet.svelte';
  import LineChart from '../lib/ui/LineChart.svelte';
  import Icon from '../lib/ui/Icon.svelte';

  let { id }: { id: string } = $props();
  // Si apre sia dalla presa (switch.…) sia dal solo sensore di potenza (es. rack, la cui presa è disattivata).
  const isSwitch = $derived(id.startsWith('switch.'));
  const sw = $derived(isSwitch ? hass.states[id] : switchOf(id));
  const power = $derived(isSwitch ? powerOf(id) : hass.states[id]);
  const p = $derived(policyOf(id));
  const on = $derived(sw?.state === 'on');
  const w = $derived(power ? +power.state : NaN);
  const name = $derived(((sw ?? power)?.attributes.friendly_name ?? id).replace(/ (Potenza|Power)$/i, ''));
  let confirming = $state(false);

  // Spegnere un carico attivo interrompe quello che sta facendo: si conferma sempre.
  const warning = $derived(p.confirmOff ?? (w > 50 ? `Sta assorbendo ${watt(w)}: spegnerla interrompe quello che sta facendo.` : null));
  function off() {
    if (warning && !confirming) { confirming = true; return; }
    if (sw) hass.callService('switch', 'turn_off', { entity_id: sw.entity_id });
    confirming = false;
  }
</script>

<Sheet renameId={(sw ?? power)?.entity_id} title={name} subtitle="{hass.areaName(hass.areaOf(sw?.entity_id ?? power?.entity_id ?? ''))} · {sw ? (on ? `Accesa ${since(sw.last_changed)}` : 'Spenta') : 'Solo misura'}" onclose={() => app.close()}>
  <div class="body">
    <div class="now">
      <p class="val num">{watt(w)}</p>
      <p class="lab">Potenza adesso</p>
    </div>
    {#if power}
      <LineChart label="Potenza di {name} nelle ultime 24 ore" series={hass.history(power.entity_id)} height={150} />
    {/if}

    {#if p.readOnly}
      <p class="notice"><Icon name="lucchetto" size={20} />{p.readOnly}</p>
    {:else if sw && on}
      {#if confirming && warning}
        <p class="notice warn"><Icon name="avviso" size={20} />{warning}</p>
        <div class="row">
          <button class="btn" onclick={() => (confirming = false)}>Annulla</button>
          <button class="btn danger" onclick={off}>Spegni comunque</button>
        </div>
      {:else}
        <button class="btn" onclick={off}><Icon name="power" size={22} />Spegni</button>
      {/if}
    {:else if sw && p.noRemoteOn}
      <p class="notice"><Icon name="lucchetto" size={20} />{p.noRemoteOn}</p>
    {:else if sw}
      <button class="btn primary" onclick={() => hass.callService('switch', 'turn_on', { entity_id: sw.entity_id })}><Icon name="power" size={22} />Accendi</button>
    {/if}
  </div>
</Sheet>

<style>
  .body { display: grid; gap: 16px; }
  .val { font-size: 46px; font-weight: 700; letter-spacing: -0.04em; line-height: 1; color: var(--energia); }
  .lab { color: var(--ink-2); font-size: 14px; margin-top: 4px; }
  .notice { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 16px; background: var(--track); font-size: 14.5px; line-height: 1.45; }
  .notice :global(svg) { margin-top: 1px; color: var(--ink-2); }
  .notice.warn { background: color-mix(in srgb, var(--luci) 16%, var(--raised)); }
  .notice.warn :global(svg) { color: var(--luci); }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 56px; border: 0; border-radius: 18px; background: var(--track); font-weight: 600; font-size: 16px; cursor: pointer; }
  .btn.primary { background: var(--energia); color: #fff; }
  .btn.danger { background: var(--pericolo); color: #fff; }
</style>
