<script setup lang="ts">
definePageMeta({
    middleware: ['organization-admin']
})

const { id } = useRoute().params

const { data: organization } = await useFetch(`/api/organizations/${id}`)

const title = usePageTitle();
title.value = organization.value?.name ? `Initiative bearbeiten: ${organization.value.name}` : "Initiative bearbeiten"
useSeoMeta({
    title
})
</script>

<template>
    <div class="grid lg:grid-cols-6">
        <OrganizationForm v-if="organization" class="lg:col-span-3" :organization="organization"
            @submit="navigateTo(`/organizations/${organization.id}`)"
            @cancel="navigateTo(`/organizations/${organization.id}`)" />
    </div>
</template>