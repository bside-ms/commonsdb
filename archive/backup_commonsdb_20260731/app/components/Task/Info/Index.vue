<script setup lang="ts">
import { TaskType, type Task, type TaskOccurrence, type WithLinks, type WithOccurrences } from '~/types/tasks';

interface TaskListItemProps {
    task: Task & WithLinks;
    taskOccurrence?: TaskOccurrence;
}
const { task } = defineProps<TaskListItemProps>()
</script>

<template>
    <div class="space-y-3">
        <div v-if="task.type === TaskType.RECURRING">
            <span class="font-serif font-semibold pr-1">Regelmäßige Aufgabe</span>
            <span class="text-xs">({{ $t(`tasks.frequency.${task.frequency}`) }})</span>
        </div>
        <div v-if="taskOccurrence" :class="[{ '-mt-2': task.type === TaskType.RECURRING }]">
            <TaskInfoPeriod :task-occurrence="taskOccurrence" class="text-sm" />
        </div>
        <ul class="space-y-px">
            <li>
                <TaskInfoPriority :task="task" />
            </li>
            <li>
                <TaskInfoEffort :task="task" />
            </li>
            <li>
                <TaskInfoReward :task="task" />
            </li>
        </ul>
    </div>
</template>