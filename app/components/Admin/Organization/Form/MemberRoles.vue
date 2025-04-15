<script setup lang="ts">
import { OrganizationMemberRole } from '@prisma/client';
import type { ModelRef } from 'vue';

defineProps<{
    placeholder: string;
}>()
const modelValue: ModelRef<string | undefined> = defineModel()
</script>

<template>
    <Select v-model="modelValue">
        <SelectTrigger class="w-32">
            <SelectValue :placeholder="placeholder" />
        </SelectTrigger>
        <SelectContent>
            <SelectGroup>
                <SelectLabel>Member Roles</SelectLabel>
                <SelectItem :value="OrganizationMemberRole.MEMBER">
                    Member
                </SelectItem>
                <SelectItem :value="OrganizationMemberRole.ADMIN">
                    Admin
                </SelectItem>
            </SelectGroup>
        </SelectContent>
    </Select>
</template>