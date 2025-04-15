<script setup lang="ts">
import { OrganizationMemberRole, type Organization, type OrganizationMember } from '@prisma/client';
import { CalendarClock, Currency, Users } from 'lucide-vue-next';

interface OrganizationListItemProps {
    organization: Organization;
    balance?: number;
    membership?: OrganizationMember;
}
defineProps<OrganizationListItemProps>()
</script>

<template>
    <Box :title="organization.name" :link="`/organizations/${organization.id}`">
        <ul class="text-sm space-y-px">
            <li>
                <div class="flex items-center gap-2">
                    <Users class="size-3" />
                    <span>X</span>
                </div>
            </li>
            <li>
                <div class="flex items-center gap-2">
                    <Currency class="size-3" />
                    <span>{{ useFormatReproduction(balance ?? 0) }}</span>
                </div>
            </li>
            <li>
                <div class="flex items-center gap-2">
                    <CalendarClock class="size-3" />
                    <span>kein Termin gebucht</span>
                </div>
            </li>
        </ul>
        <div v-if="membership?.role === OrganizationMemberRole.ADMIN" class="font-medium text-sm mt-2">
            <p>Du bist ein Admin dieser Initiative</p>
        </div>
    </Box>
</template>