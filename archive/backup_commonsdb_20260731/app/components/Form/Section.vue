<script setup lang="ts">
defineProps<{
    title: string;
    description?: string;
}>()
</script>

<template>
    <div class="form-section grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 md:grid-cols-3">
        <div>
            <h2 class="text-base font-semibold leading-7 text-gray-900">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm leading-6 text-gray-600">
                {{ description }}
            </p>
        </div>
    </div>
    <div class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
        <slot />
    </div>
</template>