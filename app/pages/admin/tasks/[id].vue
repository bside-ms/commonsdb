<script setup lang="ts">
import type { TaskFull } from '~/types/tasks';

const route = useRoute();
const { id } = route.params

const { data, refresh } = await useFetch<TaskFull>(`/api/admin/tasks/${id}`)
const task = computed(() => data.value)
</script>

<template>
    <div>
        <div v-if="task" class="grid gap-6 grid-cols-12">
            <TaskView :task="task" class="col-span-full lg:col-span-9">
                <TaskResponsibilities :task="task" />
                <AdminTaskOccurrencesWithStatus :task="task" />
            </TaskView>
            <div class="col-span-full lg:col-span-3">
                <AdminTaskActions :task="task" :refresh="refresh" />
            </div>
        </div>
        <p v-else>Aufgabendetails konnten nicht geladen werden.</p>

    </div>
</template>