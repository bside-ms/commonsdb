<script lang="ts">
	import { GraduationCap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { EmptyState } from '#lib/ui';
</script>

<svelte:head><title>{m.nav_qualifications()} · {m.app_name()}</title></svelte:head>

<h1>{m.nav_qualifications()}</h1>
<p class="mt-3 max-w-[52ch] text-muted">{m.qualifications_intro()}</p>

<EmptyState class="mt-6" icon={GraduationCap} title={m.locked_title()} description={m.locked_hint()} />
