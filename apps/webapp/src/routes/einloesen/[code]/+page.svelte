<!--
	Where the QR code on a guest slip leads. Redeeming is a button, not
	automatic on GET, so a preview or a crawler can't use the code up.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import RedeemForm from '#lib/components/RedeemForm.svelte';
</script>

<svelte:head><title>{m.redeem_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.redeem_title()}</h1>
<p class="mt-3 max-w-[52ch] text-muted">{m.redeem_intro()}</p>
<div class="mt-6 max-w-lg"><RedeemForm code={page.params.code} /></div>