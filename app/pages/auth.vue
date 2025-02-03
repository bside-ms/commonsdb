<script setup lang="ts">
definePageMeta({
    layout: false
})
</script>
<template>
    <div class="min-h-screen flex justify-center items-center">
        <div class="flex flex-col items-center gap-6">
            <NuxtLink to="/">
                <Logo class="w-16" />
            </NuxtLink>
            <NuxtPage />
        </div>
    </div>
</template>