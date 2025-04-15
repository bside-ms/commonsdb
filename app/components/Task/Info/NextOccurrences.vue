<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

defineProps<{ task: TaskWithOccurrences }>()

const { getDueEndDateFormatted } = useTask();
</script>

<template>
    <div v-if="task.occurrences && task.occurrences.length > 1">
        <div class="text-xl font-serif font-semibold mb-3">Nächste Fälligkeiten</div>
        <ul class="space-y-1">
            <li v-for="occurrence in task.occurrences?.slice(1)">
                {{ getDueEndDateFormatted(occurrence) }}
            </li>
        </ul>
    </div>
</template>