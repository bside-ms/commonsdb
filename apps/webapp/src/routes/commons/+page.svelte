<script lang="ts">
	import { Box } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { EmptyState } from '#lib/ui';
</script>

<svelte:head><title>{m.nav_commons()} · {m.app_name()}</title></svelte:head>

<h1>{m.nav_commons()}</h1>
<p class="mt-3 max-w-[52ch] text-muted">{m.commons_intro()}</p>

<EmptyState class="mt-6" icon={Box} title={m.locked_title()} description={m.locked_hint()} />
