<script setup lang="ts">
import type { TaskFull } from '~/types/tasks';

const { id } = useRoute().params

const { data, refresh } = await useFetch<TaskFull | null>(`/api/tasks/${id}`)
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
            <TaskInfoNextOccurrences :task="task" />
        </TaskView>
        <TaskViewActions class="col-span-full lg:col-span-3" :task="task" :refresh="refresh" />
    </div>
    <p v-else>Aufgabendetails konnten nicht geladen werden.</p>
</template>