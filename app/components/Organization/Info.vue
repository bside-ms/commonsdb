<script setup lang="ts">
import type { Organization, OrganizationMember } from '~/types/organizations';

interface OrganizationInfoProps {
    organization: Organization & { members: OrganizationMember[] }
}
defineProps<OrganizationInfoProps>()
</script>

<template>
    <div>
        <span class="text-muted-foreground text-sm">{{ organization.code }}</span>
        <h1 class="text-4xl font-serif font-semibold">{{ organization.name }}</h1>
    </div>
    <div v-if="organization.bio?.length" class="mt-4 prose" v-html="organization.bio"></div>
</template>