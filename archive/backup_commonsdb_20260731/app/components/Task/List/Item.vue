<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import type { TaskOccurrence, WithTask } from '~/types/tasks';

interface TaskListItemProps {
    taskOccurrence: TaskOccurrence & WithTask
}
const { taskOccurrence } = defineProps<TaskListItemProps>()
const task = computed(() => taskOccurrence.task)
</script>

<template>
    <div class="relative group flex flex-col lg:flex-row lg:items-stretch">
        <div class="bg-black text-white py-2 px-4 lg:w-1/3">
            <span class="font-serif font-medium">
                {{ task.title }}
            </span>
        </div>
        <div class="relative space-y-2 text-sm py-2 px-4 border lg:flex-1">
            <div>
                <ul class="flex gap-3">
                    <li>
                        <TaskInfoRepetition :task="task" />
                    </li>
                    <li>
                        <TaskInfoPeriod :task-occurrence="taskOccurrence" />
                    </li>
                </ul>
            </div>
            <div>
                <ul class="flex gap-3">
                    <li>
                        <TaskInfoPriority :task="task" />
                    </li>
                    <li>
                        <TaskInfoEffort :task="task" />
                    </li>
                    <li>
                        <TaskInfoReward :task="task" />
                    </li>
                </ul>
            </div>
            <div
                class="absolute right-0 top-1/2 -translate-1/2 transition-transform text-muted-foreground group-hover:text-black group-hover:scale-110">
                <ChevronRight class="size-6" />
            </div>
        </div>
        <NuxtLink :to="`/tasks/${taskOccurrence.taskId}`" class="absolute inset-0" />
    </div>
</template>