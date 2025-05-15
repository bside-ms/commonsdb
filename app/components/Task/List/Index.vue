<script setup lang="ts">
import type { TaskOccurrence, WithTask } from '~/types/tasks';

interface TaskListProps {
    taskOccurrences: (TaskOccurrence & WithTask)[],
    loading?: boolean
}
defineProps<TaskListProps>()
</script>

<template>
    <div v-if="taskOccurrences?.length || loading" class="grid gap-2">
        <Skeleton v-if="loading" class="w-full h-20" />
        <TaskListItem v-else v-for="to in taskOccurrences" :task-occurrence="to" />
    </div>
    <p v-else class="font-light">Gerade sind keine offenen Aufgaben gepflegt.</p>
</template>