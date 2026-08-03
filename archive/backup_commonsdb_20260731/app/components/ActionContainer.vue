<template>

    <Container class="relative">
        <slot />
        <div v-if="$slots.actions" class="fixed bottom-0 right-0 pr-2 pb-2 sm:pr-4">
            <slot name="actions" />
        </div>
    </Container>
</template>