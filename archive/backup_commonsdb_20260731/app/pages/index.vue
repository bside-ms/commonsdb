<script setup lang="ts">
const title = usePageTitle();
title.value = "Deine Übersicht"
useSeoMeta({
    title
})
</script>

<template>
    <div>
        <AccountDashboard />
    </div>
</template>