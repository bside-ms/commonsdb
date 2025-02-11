<script setup lang="ts">
import type { Organization } from '@prisma/client';
import type { PaginatedResult } from '~/types';

const { data, execute } = await useAsyncData(
    'organizations',
    () => $fetch<PaginatedResult<Organization>>('/api/admin/organizations'),
);
await execute();

const organizations = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.totalCount ?? 0);
</script>

<template>
    <div class="grid lg:grid-cols-6">
        <div class="space-y-3 lg:col-span-4">
            <AdminOrganizationList :organizations="organizations" />
        </div>
        <div class="col-span-full mt-8 text-sm text-destructive">Todo: Paginierung</div>
    </div>
</template>