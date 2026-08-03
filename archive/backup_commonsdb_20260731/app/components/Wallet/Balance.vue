<script setup lang="ts">
defineProps<{ walletBalance: number }>()
</script>

<template>
    <div>
        <dt class="text-xs text-muted-foreground">Guthaben</dt>
        <dd class="flex items-end gap-1">
            <span
                :class="['text-2xl font-semibold', walletBalance && { 'text-green-700': walletBalance > 0, 'text-red-700': walletBalance < 0 }]">{{
                    useFormatReproduction(walletBalance ?? 0)
                }}</span>
            <span class="text-xs pb-1">Repros</span>
        </dd>
    </div>
</template>