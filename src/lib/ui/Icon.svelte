<script lang="ts">
  import { ICONS, type IconName } from '../icons';
  let { name, size = 24 }: { name: IconName; size?: number } = $props();
</script>

<svg class="ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  {@html ICONS[name]}
</svg>

<style>
  svg { flex: none; display: block; }
</style>
