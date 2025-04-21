<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '~/types/users';

defineProps<{
    user?: Partial<User> | null
}>()
</script>

<template>
    <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
        <Avatar class="h-8 w-8 rounded-lg">
            <AvatarImage src="https://api.dicebear.com/9.x/adventurer-neutral/svg" :alt="user?.username" />
            <AvatarFallback class="rounded-lg">
                {{ user?.firstname?.charAt(0) }}
            </AvatarFallback>
        </Avatar>
        <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">{{ user?.firstname }}</span>
            <span class="truncate text-xs">{{ user?.username }}</span>
        </div>
    </div>
</template>