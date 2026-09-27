<script lang="ts">
    import {goto} from '$app/navigation';
    import {page} from '$app/state';
    import {AppShell, Avatar, Button} from '$ui';
    import {signOut} from '$features/auth';
    import {paths} from '$lib/paths';

    let {data, children} = $props();

    const nav = [
        {href: paths.tasks, label: 'Aufgaben'},
        {href: paths.account, label: 'Konto'},
        {href: paths.profile, label: 'Profil'}
    ];

    async function leave() {
        await signOut();
        await goto(paths.signIn, {invalidateAll: true});
    }
</script>

<AppShell {nav} current={page.url.pathname}>
    {#snippet aside()}
        <div class="flex items-center gap-2.5">
            <Avatar name={data.user.profile?.displayName ?? data.user.name}/>
            <Button size="sm" variant="ghost" onclick={leave}>Abmelden</Button>
        </div>
    {/snippet}

    {@render children()}
</AppShell>