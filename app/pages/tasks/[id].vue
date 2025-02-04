<script setup lang="ts">
import type { TaskFull } from '~/types/tasks';

const { id } = useRoute().params

const { data, refresh } = await useFetch<TaskFull | null>(`/api/tasks/${id}`)
const task = computed(() => data.value)

</script>

<template>
    <Container>
        <div v-if="task" class="grid gap-6 grid-cols-12">
            <TaskView :task="task" :refresh="refresh" class="col-span-full lg:col-span-9">
                <TaskNextOccurrences :task="task" />
            </TaskView>
            <TaskActions class="col-span-full lg:col-span-3" :task="task" :refresh="refresh" />
        </div>
        <p v-else>Aufgabendetails konnten nicht geladen werden.</p>
    </Container>
</template>