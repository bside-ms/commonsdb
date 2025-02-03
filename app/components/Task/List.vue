<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskListProps {
    tasks: TaskWithOccurrences[],
    loading?: boolean
}
defineProps<TaskListProps>()
</script>

<template>
    <div v-if="tasks?.length" class="space-y-6">
        <TaskListItem v-for="task in tasks" :task="task" />
    </div>
    <div v-else>
        <p class="font-light">Gerade sind keine offenen Aufgaben gepflegt.</p>
    </div>
</template>