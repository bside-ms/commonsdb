<script setup lang="ts">
import { Repeat, Repeat1 } from 'lucide-vue-next';
import { TaskType, type Task } from '~/types/tasks';

interface TaskRepetitionProps {
    task: Task
}
defineProps<TaskRepetitionProps>()


</script>

<template>
    <div class="flex items-center gap-2">
        <template v-if="task.type === TaskType.RECURRING">
            <Repeat class="size-3" />
            <span>Regelmäßige Aufgabe</span>
        </template>
        <template v-else>
            <Repeat1 class="size-3" />
            <span>Einzelaufgabe</span>
        </template>
    </div>
</template>