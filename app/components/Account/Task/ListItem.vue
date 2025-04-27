<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import type { Task, TaskOccurrence } from '~/types/tasks';

interface TaskListItemProps {
    task: Task & { occurrences: TaskOccurrence[] }
}
const { task } = defineProps<TaskListItemProps>()
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