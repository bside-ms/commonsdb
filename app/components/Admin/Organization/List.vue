<script setup lang="ts">
import type { Organization } from '@prisma/client';

interface OrganizationTaskListProps {
    organizations: Organization[]
}
defineProps<OrganizationTaskListProps>()
</script>

<template>
    <div class="-my-4 divide-y divide-gray-200">
        <template v-for="org in organizations">
            <OrganizationListItem :organization="org" scope="ADMIN" class="py-4" />
        </template>
    </div>
</template>