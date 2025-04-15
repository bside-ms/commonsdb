<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskListProps {
    tasks: TaskWithOccurrences[],
    type: "list" | "grid"
    loading?: boolean
}
defineProps<TaskListProps>()
</script>

<template>
    <div v-if="tasks?.length" :class="[{ 'space-y-6': type === 'list', 'grid gap-5 md:grid-cols-2': type === 'grid' }]">
        <TaskListItem v-for="task in tasks" :task="task" />
    </div>
    <div v-else>
        <p class="font-light">Gerade sind keine offenen Aufgaben gepflegt.</p>
    </div>
</template>