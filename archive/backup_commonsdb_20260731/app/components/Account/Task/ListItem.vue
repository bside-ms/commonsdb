<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { type Task, type WithOccurrences, type TaskOccurrence, TaskOccurrenceStatus } from '~/types/tasks';



interface TaskListItemProps {
    task: Task & WithOccurrences
}
const { task } = defineProps<TaskListItemProps>()
const nextOccurrence = computed(() => task.occurrences?.find((o: TaskOccurrence) => o.status === TaskOccurrenceStatus.PENDING))
</script>

<template>
    <div class="relative group">
        <div class="flex gap-4 px-2 py-3">
            <div class="flex-1">
                <div class="text-xl font-serif font-semibold mb-1">{{ task.title }}</div>
                <TaskInfo :task="task" :task-occurrence="nextOccurrence" />
            </div>
            <div
                class="flex items-center transition-transform text-muted-foreground group-hover:text-black group-hover:scale-125">
                <ChevronRight class="size-6" />
            </div>
        </div>
        <NuxtLink
            :to="nextOccurrence ? `/tasks/${nextOccurrence.taskId}/occurrences/${nextOccurrence.id}` : `/tasks/${task.id}`"
            class="absolute inset-0" />
    </div>
</template>