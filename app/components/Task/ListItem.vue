<script setup lang="ts">
import { TaskType } from '@prisma/client';
import { ChevronRight } from 'lucide-vue-next';
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskListItemProps {
    task: TaskWithOccurrences
    scope?: "USER" | "ADMIN"
}
const { task } = defineProps<TaskListItemProps>()
</script>

<template>
    <div>
        <NuxtLink :to="`${scope === 'ADMIN' ? '/admin' : ''}/tasks/${task.id}`"
            class="block group transition-shadow hover:shadow-md">
            <div class="bg-black px-3 py-1">
                <div class=" font-serif font-semibold text-lg text-white">
                    {{ task.title }}
                </div>
            </div>
            <div class="flex gap-4 px-2 py-3">
                <div class="flex-1 space-y-3">
                    <div v-if="task.type === TaskType.RECURRING" class="font-serif font-semibold">Regelmäßige Aufgabe
                    </div>
                    <ul class="space-y-px">
                        <li v-if="task.priority">
                            <TaskPriority :priority="task.priority" />
                        </li>
                        <li>
                            <TaskEffort :task="task" />
                        </li>
                        <li>
                            <TaskReward :task="task" />
                        </li>
                    </ul>
                    <div v-if="task.description" class="prose prose-p:text-black line-clamp-1"
                        v-html="task.description" />
                </div>
                <div
                    class="flex items-center transition-transform text-muted-foreground group-hover:text-black group-hover:scale-125">
                    <ChevronRight class="w-6 h-6" />
                </div>
            </div>
        </NuxtLink>
    </div>
</template>