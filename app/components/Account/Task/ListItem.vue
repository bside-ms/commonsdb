<script setup lang="ts">
import { TaskType } from '@prisma/client';
import { ChevronRight } from 'lucide-vue-next';
import type { TaskWithCategories, TaskWithOccurrences } from '~/types/tasks';

interface TaskListItemProps {
    task: TaskWithOccurrences & TaskWithCategories
}
const { task } = defineProps<TaskListItemProps>()
</script>

<template>
    <div>
        <NuxtLink :to="`/tasks/${task.id}`" class="block group transition-shadow hover:shadow-md">
            <div class="flex gap-4 px-2 py-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <TaskPriority v-if="task.priority" :priority="task.priority" :hide-label="true" />
                        <div class="font-serif font-semibold">{{ task.title }}</div>
                    </div>
                    <div>
                        <TaskEffort :task="task" />
                    </div>
                </div>
                <div
                    class="flex items-center transition-transform text-muted-foreground group-hover:text-black group-hover:scale-125">
                    <ChevronRight class="w-6 h-6" />
                </div>
            </div>
        </NuxtLink>
    </div>
</template>