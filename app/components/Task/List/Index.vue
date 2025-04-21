<script setup lang="ts">
import type { Skeleton } from '~/components/ui/skeleton';
import type { Task, WithOccurences } from '~/types/tasks';

interface TaskListProps {
    tasks: (Task & WithOccurences)[],
    type: "list" | "grid"
    loading?: boolean
}
defineProps<TaskListProps>()
</script>

<template>
    <div v-if="tasks?.length || loading"
        :class="[{ 'space-y-6': type === 'list', 'grid gap-5 md:grid-cols-2': type === 'grid' }]">
        <Skeleton v-if="loading" class="w-full h-44" />
        <TaskListItem v-else v-for="task in tasks" :task="task" />
    </div>
    <div v-else>
        <p class="font-light">Gerade sind keine offenen Aufgaben gepflegt.</p>
    </div>
</template>