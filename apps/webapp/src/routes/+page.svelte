<script lang="ts">
    import {m} from '#lib/paraglide/messages.js';
    import type {PageProps} from './$types';

    let {data}: PageProps = $props();
</script>

<h1 class="text-2xl font-semibold">{m.home_greeting({name: data.user?.name ?? ''})}</h1>