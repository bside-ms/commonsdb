<script setup lang="ts">
interface SectionHeadingProps {
    description?: string
    hideSeparator?: boolean
}
defineProps<SectionHeadingProps>()
</script>

<template>
    <div class="mb-6">
        <div class="flex items-end justify-between">
            <div class="space-y-1">
                <h3 class="text-lg font-medium">
                    <slot />
                </h3>
                <p v-if="description" class="text-sm text-muted-foreground" v-html="description" />
            </div>
            <div v-if="$slots.actions">
                <slot name="actions" />
            </div>
        </div>
        <Separator v-if="!hideSeparator" :class="[$slots.actions ? 'mt-4' : 'mt-2']" />
    </div>
</template>