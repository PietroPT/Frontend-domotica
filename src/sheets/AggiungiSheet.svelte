<script lang="ts">
  // Sceglie quali entità di HA compaiono nella Casa. Non abbina dispositivi:
  // quello si fa in Zigbee2MQTT / Home Assistant, poi l'entità compare qui.
  import { hass } from '../lib/ha/hass.svelte';
  import { app } from '../lib/app.svelte';
  import { layout } from '../lib/layout.svelte';
  import { iconOf, nameOf } from '../lib/view';
  import Sheet from '../lib/ui/Sheet.svelte';
  import Icon from '../lib/ui/Icon.svelte';

  let q = $state('');
  const kinds: [string, string][] = [['tutto', 'Tutto'], ['light', 'Luci'], ['switch', 'Prese'], ['camera', 'Telecamere'], ['altro', 'Altro']];
  let kind = $state('tutto');

  // L'infrastruttura (rack, UPS) sta solo in Avanzate: non si mette nella Casa.
  const infra = /presa_rack|^sensor\.ups_/;
  const usable = (id: string) => {
    if (infra.test(id)) return false;
    const d = id.split('.')[0];
    const s = hass.states[id];
    return ['light', 'switch', 'climate', 'camera'].includes(d) || (d === 'sensor' && s.attributes.device_class === 'power');
  };
  const matchKind = (id: string) => {
    const d = id.split('.')[0];
    return kind === 'tutto' || d === kind || (kind === 'altro' && !['light', 'switch', 'camera'].includes(d));
  };
  const groups = $derived(
    [...hass.areas.map((a) => a.area_id), null]
      .map((area) => ({
        area,
        items: Object.values(hass.states)
          .filter((s) => usable(s.entity_id) && matchKind(s.entity_id) && hass.areaOf(s.entity_id) === area)
          .filter((s) => !q || `${nameOf(s)} ${s.entity_id}`.toLowerCase().includes(q.toLowerCase()))
          .sort((a, b) => Number(layout.has(a.entity_id)) - Number(layout.has(b.entity_id))),
      }))
      .filter((g) => g.items.length),
  );
</script>

<Sheet title="Aggiungi alla Casa" subtitle="Dispositivi di Home Assistant, divisi per stanza" onclose={() => app.close()}>
  <label class="search">
    <Icon name="cerca" size={20} />
    <input type="search" placeholder="Cerca per nome" bind:value={q} aria-label="Cerca dispositivi" />
  </label>
  <div class="kinds" role="radiogroup" aria-label="Tipo">
    {#each kinds as [k, label]}
      <button role="radio" aria-checked={kind === k} class:sel={kind === k} onclick={() => (kind = k)}>{label}</button>
    {/each}
  </div>

  {#each groups as g (g.area)}
    <section>
      <h3>{hass.areaName(g.area)}</h3>
      <ul>
        {#each g.items as s (s.entity_id)}
          {@const pinned = layout.has(s.entity_id)}
          <li>
            <span class="ic"><Icon name={iconOf(s)} /></span>
            <span class="what"><b>{nameOf(s)}</b><small>{s.entity_id}</small></span>
            <button class="act" class:pinned onclick={() => (pinned ? layout.remove(s.entity_id) : layout.add(s.entity_id))}
              aria-label="{pinned ? 'Togli' : 'Aggiungi'} {nameOf(s)}">
              <Icon name={pinned ? 'ok' : 'piu'} size={20} />{pinned ? 'Nella Casa' : 'Aggiungi'}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="empty">Nessun dispositivo trovato{q ? ` per «${q}»` : ''}.</p>
  {/each}

  <div class="howto">
    <Icon name="zigbee" size={22} />
    <p><b>Una luce o una presa nuova?</b> Abbinala in Zigbee2MQTT (Permetti join), poi in Home Assistant assegnale la stanza: comparirà qui, nel gruppo giusto.</p>
  </div>
</Sheet>

<style>
  .search { display: flex; align-items: center; gap: 8px; padding: 0 14px; min-height: 48px; border-radius: 14px; background: var(--track); color: var(--ink-2); }
  input { flex: 1; border: 0; background: none; font: inherit; color: var(--ink); outline: none; min-height: 44px; }
  input::placeholder { color: var(--ink-3); }
  .kinds { display: flex; gap: 6px; margin: 12px 0 6px; overflow-x: auto; }
  .kinds button { flex: none; min-height: 38px; padding: 0 14px; border-radius: 19px; border: 0; background: var(--track); font-weight: 600; font-size: 14px; color: var(--ink-2); cursor: pointer; }
  .kinds .sel { background: var(--ink); color: var(--raised); }
  h3 { font-size: 15px; font-weight: 700; margin: 18px 0 4px; color: var(--ink-2); }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; padding: 8px 0; }
  li + li { border-top: 1px solid var(--sep); }
  .ic { width: 44px; height: 44px; border-radius: 50%; background: var(--track); display: grid; place-items: center; color: var(--ink-2); }
  .what { min-width: 0; }
  .what b { display: block; font-weight: 600; font-size: 15px; }
  .what small { display: block; font-size: 12.5px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .act { display: flex; align-items: center; gap: 4px; min-height: 40px; padding: 0 12px 0 8px; border-radius: 20px; border: 0; background: var(--energia); color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }
  .act.pinned { background: var(--track); color: var(--ink-2); }
  .empty { color: var(--ink-2); padding: 18px 0; }
  .howto { display: flex; gap: 12px; margin-top: 18px; padding: 14px; border-radius: 16px; background: var(--track); font-size: 14px; line-height: 1.45; }
  .howto :global(svg) { color: var(--ink-2); margin-top: 2px; }
</style>
