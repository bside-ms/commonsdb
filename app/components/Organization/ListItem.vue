<script setup lang="ts">
import { TaskType, type Organization } from '@prisma/client';
import { ChevronRight } from 'lucide-vue-next';

interface OrganizationListItemProps {
    organization: Organization
    scope?: "USER" | "ADMIN"
}
defineProps<OrganizationListItemProps>()
</script>

<template>
    <div>
        <NuxtLink :to="`${scope === 'ADMIN' ? '/admin' : ''}/organizations/${organization.id}`"
            class="block group transition-shadow hover:shadow-md">
            <div class="bg-black px-3 py-1">
                <div class=" font-serif font-semibold text-lg text-white">
                    {{ organization.name }}
                </div>
            </div>
            <div class="flex gap-4 px-2 py-3">
                <div class="flex-1 space-y-3">
                    <div class="text-sm text-muted-foreground font-serif font-semibold">{{ organization.code }}</div>
                    <dl class="grid gap-x-3 gap-y-px grid-cols-2 text-sm max-w-max">
                        <dt>Memberanzahl</dt>
                        <dd>{{ organization._count.members ?? 0 }}</dd>

                        <dt>Kontostand</dt>
                        <dd>XX</dd>
                    </dl>
                </div>
                <div
                    class="flex items-center transition-transform text-muted-foreground group-hover:text-black group-hover:scale-125">
                    <ChevronRight class="w-6 h-6" />
                </div>
            </div>
        </NuxtLink>
    </div>
</template>