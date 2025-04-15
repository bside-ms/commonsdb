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
                    <div class="flex items-center gap-2">
                        <TaskInfoPriority v-if="task.priority" :priority="task.priority" :hide-label="true" />
                        <div class="font-serif font-semibold">{{ task.title }}</div>
                    </div>
                    <div>
                        <TaskInfoEffort :task="task" />
                        <div v-if="getNextPendingOccurrenceWithDueDate(task)" class="flex items-center gap-2 mt-2">
                            <CircleCheckBig class="size-3 stroke-3" />
                            <span class="font-semibold text-sm">
                                zu erledigen bis {{ getNextPendingDueEndDateFormatted(task) }}</span>
                        </div>
                    </div>
                </div>
                <div
                    class="flex items-center transition-transform text-muted-foreground group-hover:text-black group-hover:scale-125">
                    <ChevronRight class="size-6" />
                </div>
            </div>
        </NuxtLink>
    </div>
</template>