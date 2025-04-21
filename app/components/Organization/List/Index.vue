<script setup lang="ts">
import { Skeleton } from '~/components/ui/skeleton';
import type { Organization } from '~/types/organizations';

interface OrganizationListProps {
    organizations: Organization[];
    loading?: boolean;
}
defineProps<OrganizationListProps>()
</script>

<template>
    <div v-if="organizations?.length || loading" class="grid gap-6">
        <Skeleton v-if="loading" v-for="i in 3" class="w-full h-10" />
        <OrganizationListItem v-else v-for="organization in organizations" :organization="organization" />
    </div>
    <div v-else class="prose px-2">
        <p class="font-light">Es sind keine Initiativen angelegt.</p>
    </div>
</template>