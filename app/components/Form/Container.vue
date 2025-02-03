<script setup lang="ts">
defineProps<{ title?: string; description?: string }>()
</script>

<template>
    <div class="space-y-4 md:space-y-6">
        <template v-if="title">
            <div>
                <h3 class="text-lg font-medium">
                    {{ title }}
                </h3>
                <p class="text-sm text-muted-foreground">
                    {{ description }}
                </p>
            </div>
            <Separator />
        </template>
        <slot />
    </div>
</template>