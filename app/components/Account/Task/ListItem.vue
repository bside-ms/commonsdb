<script setup lang="ts">
import { ChevronRight, CircleCheckBig } from 'lucide-vue-next';
import type { TaskWithCategories, TaskWithOccurrences } from '~/types/tasks';

interface TaskListItemProps {
    task: TaskWithOccurrences & TaskWithCategories
}
const { task } = defineProps<TaskListItemProps>()

const { getNextPendingOccurrenceWithDueDate, getNextPendingDueEndDateFormatted } = useTask()
</script>

<template>
    <div>
        <NuxtLink :to="`/tasks/${task.id}`" class="block group">
            <div class="flex gap-4 px-2 py-3">
                <div class="flex-1">
                    <div class="font-serif font-semibold">{{ task.title }}</div>
                    <TaskInfo :task="task" />
                </div>
                <div
                    class="flex items-center transition-transform text-muted-foreground group-hover:text-black group-hover:scale-125">
                    <ChevronRight class="size-6" />
                </div>
            </div>
        </NuxtLink>
    </div>
</template>