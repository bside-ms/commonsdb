<script setup lang="ts">
import { Clock } from 'lucide-vue-next';
import { Separator } from '../ui/separator';
import { TaskFrequency } from '@prisma/client';
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskEffortProps {
    task: TaskWithOccurrences
}
defineProps<TaskEffortProps>()

const { getNextPendingOccurrence, getNextPendingDueEndDateFormatted } = useTask()
</script>

<template>
    <div class="flex items-center gap-2">
        <Clock class="w-3 h-3" />
        <span v-if="task.expense">{{ useFormatReproduction(task.expense, { showMinutes: true }) }}</span>
        <template v-if="getNextPendingOccurrence(task)">
            <Separator orientation="vertical" class="h-5" />
            <div>zu erledigen bis {{ getNextPendingDueEndDateFormatted(task) }}</div>
            <template v-if="task.frequency && task.frequency !== TaskFrequency.IRREGULAR">
                <Separator orientation="vertical" class="h-5" />
                {{ $t(`tasks.frequency.${task.frequency}`) }}
            </template>
        </template>
    </div>
</template>