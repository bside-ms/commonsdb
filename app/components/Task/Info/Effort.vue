<script setup lang="ts">
import { Clock } from 'lucide-vue-next';
import type { Task, WithOccurences } from '~/types/tasks';

interface TaskEffortProps {
    task: Task & WithOccurences
}
defineProps<TaskEffortProps>()
</script>

<template>
    <div class="flex items-center gap-2">
        <Clock class="size-3" />
        <span v-if="task.expense">{{ useFormatReproduction(task.expense, { showMinutes: true }) }}</span>
    </div>
</template>