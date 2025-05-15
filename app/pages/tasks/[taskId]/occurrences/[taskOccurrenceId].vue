<script setup lang="ts">
import type { TaskOccurrence, WithTaskAndLinks } from '~/types/tasks';

const { taskId, taskOccurrenceId } = useRoute().params

const { data, refresh } = await useFetch<TaskOccurrence & WithTaskAndLinks | null>(`/api/tasks/${taskId}/occurrences/${taskOccurrenceId}`)

const taskOccurrence = computed(() => {
    const { task, ...taskOccurrence } = data.value ?? {};
    return taskOccurrence;
})
const task = computed(() => data.value?.task)

const title = usePageTitle();
title.value = task.value?.title ? `Aufgabe: ${task.value.title}` : "Aufgabendetails"
useSeoMeta({
    title
})
</script>

<template>
    <div v-if="task" class="grid gap-6 grid-cols-12">
        <div class="col-span-full lg:col-span-9">
            <TaskView :task="task" :task-occurrence="taskOccurrence" :refresh="refresh" />
        </div>
        <div class="col-span-full lg:col-span-3">
            <TaskOccurrenceViewActions class="col-span-full lg:col-span-3" :task-occurrence="taskOccurrence"
                :refresh="refresh" />
        </div>
    </div>
    <p v-else>Aufgabendetails konnten nicht geladen werden.</p>
</template>