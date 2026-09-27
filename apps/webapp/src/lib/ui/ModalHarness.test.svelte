<script lang="ts">
    /** Test-only harness: Modal needs a trigger to test focus return. */
    import Modal from './Modal.svelte';

    let open = $state(false);
</script>

<button onclick={() => (open = true)}>Open</button>

<Modal bind:open title="Confirm shift">
    <p>Body</p>
</Modal>