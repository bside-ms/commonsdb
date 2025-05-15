<script setup lang="ts">
import type { Task, WithOccurrences } from '~/types/tasks';

const { taskId } = useRoute().params

const { data, refresh } = await useFetch<Task & WithOccurrences | null>(`/api/tasks/${taskId}`)
const task = computed(() => data.value)

const title = usePageTitle();
title.value = task.value?.title ? `Aufgabe: ${task.value.title}` : "Aufgabendetails"
useSeoMeta({
    title
})
</script>

<template>
    <div v-if="task" class="grid gap-6 grid-cols-12">
        <TaskView :task="task" :refresh="refresh" class="col-span-full lg:col-span-9">
            <TaskInfoOccurrences :task-occurrences="task.occurrences" />
        </TaskView>
        <TaskViewActions class="col-span-full lg:col-span-3" :task="task" :refresh="refresh" />
    </div>
    <p v-else>Aufgabendetails konnten nicht geladen werden.</p>
</template>