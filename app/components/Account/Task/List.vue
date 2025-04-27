<script setup lang="ts">
import type { Task, TaskOccurrence } from '~/types/tasks';

const { data } = await useFetch<{ task: Task, nextOccurrence: TaskOccurrence }[]>('/api/users/me/task-occurrences')
const tasks = computed(() => data.value?.map(row => ({
    ...row.task,
    occurrences: [row.nextOccurrence]
})))
</script>

<template>
    <div>
        <div v-if="tasks?.length" class="space-y-6">
            <ul class="-my-2 divide-y divide-gray-300">
                <li v-for="task in tasks">
                    <AccountTaskListItem :task="task" />
                </li>
            </ul>
        </div>
        <div v-else class="prose px-2">
            <p class="font-light">{{ $t("users.tasks.none") }}</p>
        </div>
    </div>
</template>