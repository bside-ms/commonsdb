<script setup lang="ts">
import { TaskType } from '@prisma/client';
import { CircleCheckBig } from 'lucide-vue-next';
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskListItemProps {
    task: TaskWithOccurrences
}
const { task } = defineProps<TaskListItemProps>()

const { getNextPendingOccurrenceWithDueDate, getNextPendingDueEndDateFormatted } = useTask()
</script>

<template>
    <div class="space-y-3">
        <div v-if="task.type === TaskType.RECURRING">
            <span class="font-serif font-semibold pr-1">Regelmäßige Aufgabe</span>
            <span class="text-xs">({{ $t(`tasks.frequency.${task.frequency}`) }})</span>
        </div>
        <ul class="space-y-px">
            <li v-if="task.priority">
                <TaskInfoPriority :priority="task.priority" />
            </li>
            <li>
                <TaskInfoEffort :task="task" />
            </li>
            <li>
                <TaskInfoReward :task="task" />
            </li>
        </ul>
        <div v-if="getNextPendingOccurrenceWithDueDate(task)" class="flex items-center gap-2">
            <CircleCheckBig class="size-4 stroke-3" />
            <span class="font-semibold text-sm">
                zu erledigen bis {{ getNextPendingDueEndDateFormatted(task) }}</span>
        </div>
    </div>
</template>