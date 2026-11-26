<script lang="ts">
	import { Users } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { EmptyState } from '#lib/ui';
</script>

<svelte:head><title>{m.nav_initiatives()} · {m.app_name()}</title></svelte:head>

<h1>{m.nav_initiatives()}</h1>
<p class="mt-3 max-w-[52ch] text-muted">{m.initiatives_intro()}</p>

<EmptyState class="mt-6" icon={Users} title={m.locked_title()} description={m.locked_hint()} />
