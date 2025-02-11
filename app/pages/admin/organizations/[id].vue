<script setup lang="ts">
import type { Organization } from '@prisma/client';

const route = useRoute();
const { id } = route.params

const { data } = await useFetch<Organization>(`/api/admin/organizations/${id}`)
const organization = computed(() => data.value)
</script>

<template>
    <div class="grid lg:grid-cols-6">
        <div class="lg:col-span-4">
            <AdminOrganizationForm v-if="organization" :organization="organization" />
            <p v-else>Organisation nicht gefunden.</p>
        </div>
    </div>
</template>