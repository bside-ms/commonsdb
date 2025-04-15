<script setup lang="ts">
import type { Organization, OrganizationMember } from '@prisma/client';

interface UserOrganizationMembershipListProps {
    memberships: (OrganizationMember & {
        organization: Organization
    })[]
}
defineProps<UserOrganizationMembershipListProps>()
</script>

<template>
    <div v-if="memberships?.length" class="grid gap-6">
        <OrganizationListItem v-for="{ organization, ...membership } in memberships" :organization="organization"
            :membership="membership" />
    </div>
    <div v-else class="prose px-2">
        <p class="font-light">Du bist noch kein Teil einer Initiative.</p>
    </div>
</template>