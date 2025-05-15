<script setup lang="ts">
import type { TaskOccurrence } from '~/types/tasks';

defineProps<{ taskOccurrences: TaskOccurrence[] }>()
</script>

<template>
    <div v-if="taskOccurrences?.length > 1">
        <div class="text-xl font-serif font-semibold mb-3">Nächste Fälligkeiten</div>
        <ul class="space-y-1">
            <li v-for="occurrence in taskOccurrences">
                <TaskInfoPeriod :task-occurrence="occurrence" />
            </li>
        </ul>
    </div>
</template>