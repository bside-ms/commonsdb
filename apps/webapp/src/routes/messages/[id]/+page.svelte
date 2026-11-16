<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Conversation from '../Conversation.svelte';
</script>

<Conversation id={page.params.id!} backHref={resolve('/messages')} />
