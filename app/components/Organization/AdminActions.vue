<script setup lang="ts">
import type { Organization, OrganizationMember } from '@prisma/client';

interface OrganizationInfoProps {
    organization: Organization & { members: OrganizationMember[] }
}
const { organization } = defineProps<OrganizationInfoProps>()
const { user } = await useUserSession()

const isAdmin = computed(() => !!organization.members.find(m => m.userId === user.value?.id))
</script>

<template>
    <div v-if="isAdmin">
        <div class="flex gap-4 lg:flex-col">
            <Button>{{ $t("organizations.actions.book") }}</Button>
            <Button as-child>
                <NuxtLink :to="`/organizations/${organization.id}/edit`">
                    {{ $t("organizations.actions.edit") }}
                </NuxtLink>
            </Button>
        </div>
    </div>
</template>