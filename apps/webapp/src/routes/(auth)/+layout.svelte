<script lang="ts">
    /**
     * No app shell here: someone who isn't signed in has no nav to
     * use, and showing a disabled one is worse than showing none.
     */
    let {children} = $props();
</script>

<div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
    <p class="mb-6 font-semibold tracking-[-0.02em]">B-SIDE</p>
    {@render children()}
</div>