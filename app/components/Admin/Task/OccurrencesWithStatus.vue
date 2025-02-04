<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

defineProps<{ task: TaskWithOccurrences }>()

const { getDueEndDateFormatted } = useTask()
</script>

<template>
    <div v-if="task.occurrences?.length && task.occurrences.some(o => o.dueEndDate)">
        <div class="text-xl font-serif font-semibold mb-3">Fälligkeiten</div>
        <div class="grid grid-cols-2 max-w-max gap-x-6 gap-y-2">
            <div class="col-span-full grid grid-cols-subgrid">
                <div class="font-serif">Datum</div>
                <div class="font-serif">Status</div>
            </div>
            <div v-for="occurrence in task.occurrences" class="col-span-full grid grid-cols-subgrid">
                <div>bis {{ getDueEndDateFormatted(occurrence) }}</div>
                <div> {{ occurrence.status }}</div>
            </div>
        </div>
    </div>
</template>