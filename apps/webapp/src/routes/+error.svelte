<!--
	Error page. error(403, 'forbidden') and friends carry a code as message
	(see lib/server/guards.ts); unknown codes get the generic text.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { Button } from '#lib/ui';
</script>

<h1>{page.status}</h1>
<p class="mt-3">{errorMessage(page.error?.message ?? '')}</p>
<div class="mt-6">
	<Button variant="ghost" href={resolve('/')}>{m.nav_back_to_app()}</Button>
</div>
