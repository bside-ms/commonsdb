<script setup lang="ts">
definePageMeta({
    middleware: ["admin-user"]
})

const title = usePageTitle();
title.value = "Neue Initiative";
useSeoMeta({
    title
})
</script>

<template>
    <div class="grid lg:grid-cols-6">
        <AdminOrganizationForm class="lg:col-span-3" @submit="navigateTo('/organizations')"
            @cancel="navigateTo('/organizations')" />
    </div>
</template>