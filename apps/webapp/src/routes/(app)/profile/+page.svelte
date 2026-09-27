<script lang="ts">
    import {ProfileForm} from '$features/profile';

    let {data} = $props();
</script>

<svelte:head><title>Profil — B-SIDE</title></svelte:head>

<h1 class="mb-5">Profil</h1>

<ProfileForm user={data.user}/>