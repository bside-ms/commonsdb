<script setup lang="ts">
import { OrganizationMemberRole } from '@prisma/client';
import { Minus } from 'lucide-vue-next';
import { FieldArray } from 'vee-validate';
import { Button } from '~/components/ui/button';

interface AdminOrganizationFormMemberProps {
    name: string;
    loading?: boolean;
}
const { name } = defineProps<AdminOrganizationFormMemberProps>();

const userInput = ref()
</script>

<template>
    <div>
        <FieldArray v-slot="{ fields, push, remove }" :name="name">
            <div class="flex gap-4 items-center">
                <FormCommand ref="userInputCommand" class="flex-1" v-model="userInput" placeholder="User suchen..."
                    :fetch-suggestions="async (search?: string) => {
                        const { data } = await useFetch('/api/users', {
                            query: {
                                search
                            }
                        })
                        return data.value?.map(u => ({ value: u, label: `${u.username} (${u.email})` })) ?? []
                    }" :disabled="loading" />
                <Button type="button" variant="outline" size="sm" @click="() => {
                    push({
                        user: userInput.value,
                        role: OrganizationMemberRole.MEMBER
                    })
                    userInput = null
                }">
                    Hinzufügen
                </Button>
            </div>
            <div v-if="fields?.length" class="grid gap-3 mt-4">
                <div v-for="({ value }, index) in fields" class="flex items-baseline justify-between">
                    <div class="flex flex-col gap-px">
                        <span class="font-medium">{{ value.user.username ?? 'username' }}</span>
                        <span class="text-sm">{{ value.user.email }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <OrganizationFormMemberRoles v-model="value.role" placeholder="Member Role" />
                        <Button variant="ghost" size="icon" @click="remove(index)">
                            <Minus class="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </FieldArray>
    </div>
</template>