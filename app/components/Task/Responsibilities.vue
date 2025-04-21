<script setup lang="ts">
import type { Task, TaskAssignment } from '~/types/tasks';
import type { User } from '~/types/users';

defineProps<{ task: Task & { assignments: (TaskAssignment & { user: User })[] } }>()
</script>

<template>
    <div v-if="task.assignments?.length">
        <div class="text-xl font-serif font-semibold mb-3">Verantwortlichkeiten</div>
        <ul class="space-y-1">
            <li v-for="assignment in task.assignments" class="flex gap-2">
                <Avatar class="size-6 rounded-lg mt-1">
                    <AvatarImage src="https://api.dicebear.com/9.x/lorelei/svg?seed=Sarah"
                        :alt="assignment.user.email" />
                    <AvatarFallback class="rounded-lg">
                        BS
                    </AvatarFallback>
                </Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="font-semibold">{{ assignment.user.username ?? 'username' }}</span>
                    <span class="text-xs">{{ assignment.user.email }}</span>
                    <span class="text-xs text-muted-foreground">seit {{
                        formatISODateTime(assignment.assignedAt, "dd.LL.yyyy HH:mm 'Uhr'") }}</span>
                </div>
            </li>
        </ul>
    </div>
</template>