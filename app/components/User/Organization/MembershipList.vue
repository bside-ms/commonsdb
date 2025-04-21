<script setup lang="ts">
import { Skeleton } from '~/components/ui/skeleton';
import type { Organization, OrganizationMember } from '~/types/organizations';

interface UserOrganizationMembershipListProps {
    memberships: (OrganizationMember & {
        organization: Organization
    })[];
    loading?: boolean;
}
defineProps<UserOrganizationMembershipListProps>()
</script>

<template>
    <div v-if="memberships?.length || loading" class="grid gap-6">
        <Skeleton v-if="loading" v-for="i in 3" class="w-full h-10" />
        <OrganizationListItem v-else v-for="{ organization, ...membership } in memberships" :organization="organization"
            :membership="membership" />
    </div>
    <div v-else class="prose px-2">
        <p class="font-light">Du bist noch kein Teil einer Initiative.</p>
    </div>
</template>