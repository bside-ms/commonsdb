<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';

interface BoxProps {
    title: string;
    link?: string;
}
defineProps<BoxProps>();
</script>

<template>
    <div :class="['relative flex flex-col', { 'group transition-shadow hover:shadow-md': link }]">
        <div class="border border-black bg-black px-3 py-1">
            <div class=" font-serif font-semibold text-lg text-white">
                {{ title }}
            </div>
        </div>
        <div class="flex-1 flex gap-4 px-2 py-3 border border-muted-foreground/30 border-t-0">
            <div class="flex-1">
                <slot />
            </div>
            <div v-if="link"
                class="flex items-end transition-transform text-muted-foreground group-hover:text-black group-hover:scale-105">
                <ChevronRight class="size-6" />
            </div>
        </div>
        <NuxtLink v-if="link" :to="link" class="block absolute inset-0" />
    </div>
</template>