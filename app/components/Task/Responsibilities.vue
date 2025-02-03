<script setup lang="ts">
import type { TaskWithResponsibilities } from '~/types/tasks';

defineProps<{ task: TaskWithResponsibilities }>()
</script>

<template>
    <div v-if="task.responsibilities?.length">
        <div class="text-xl font-serif font-semibold mb-3">Verantwortlichkeiten</div>
        <ul class="space-y-1">
            <li v-for="responsibility in task.responsibilities" class="flex gap-2">
                <Avatar class="size-6 rounded-lg mt-1">
                    <AvatarImage src="https://api.dicebear.com/9.x/lorelei/svg?seed=Sarah"
                        :alt="responsibility.user.email" />
                    <AvatarFallback class="rounded-lg">
                        BS
                    </AvatarFallback>
                </Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="font-semibold">{{ responsibility.user.username ?? 'username' }}</span>
                    <span class="text-xs">{{ responsibility.user.email }}</span>
                    <span class="text-xs text-muted-foreground">seit {{
                        formatISODateTime(responsibility.assignedAt.toString(), "dd.LL.yyyy HH:mm 'Uhr'") }}</span>
                </div>
            </li>
        </ul>
    </div>
</template>