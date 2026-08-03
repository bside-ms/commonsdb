<script setup lang="ts">
import { OrganizationMemberRole, type Organization, type OrganizationMember, type WithMembersAndUser } from '~/types/organizations';
import { Separator } from '~/components/ui/separator';

interface OrganizationInfoProps {
    organization: Organization & WithMembersAndUser
}
const { organization } = defineProps<OrganizationInfoProps>()
const { user } = await useUserSession()

const { isAdminUser } = useUser()
const isAdmin = computed(() => isAdminUser.value || !!organization.members.find(m => m.userId === user.value?.id && m.role === OrganizationMemberRole.ADMIN))
</script>

<template>
    <div class="grid gap-4">
        <Button size="sm" variant="destructive">{{ $t("organizations.actions.resign") }}</Button>
        <template v-if="isAdmin">
            <Separator label="Admin Actions" />
            <Button size="sm">{{ $t("organizations.actions.book") }}</Button>
            <Button size="sm" as-child>
                <NuxtLink :to="`/organizations/${organization.id}/edit`">
                    {{ $t("organizations.actions.edit") }}
                </NuxtLink>
            </Button>
        </template>
    </div>
</template>