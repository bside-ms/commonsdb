<script setup lang="ts">
definePageMeta({
    middleware: ["admin-user"]
})

const title = usePageTitle();
title.value = "Neue Aufgabe";
useSeoMeta({
    title
})
</script>

<template>
    <div class="grid lg:grid-cols-6">
        <AdminTaskForm class="lg:col-span-3" @submit="navigateTo('/tasks')" @cancel="navigateTo('/tasks')" />
    </div>
</template>