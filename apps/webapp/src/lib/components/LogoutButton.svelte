<!--
	Logout as a real POST form (works without JS). Button props pass
	through, so each place picks its own size/variant.
-->
<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { Button } from '#lib/ui';

	type Props = Pick<ComponentProps<typeof Button>, 'size' | 'variant' | 'block'> & {
		class?: string;
	};

	let { size = 'sm', variant = 'ghost', block, class: className }: Props = $props();
</script>

<form method="post" action="/logout" class={className}>
	<Button type="submit" {size} {variant} {block}>{m.logout()}</Button>
</form>
