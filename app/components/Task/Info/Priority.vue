<script setup lang="ts">
import { TaskPriority } from '@prisma/client';
import { Flame } from 'lucide-vue-next';

interface TaskPriorityProps {
    priority: TaskPriority;
    hideLabel?: boolean;
}
const { priority } = defineProps<TaskPriorityProps>()

const priorityColorClass = computed(() => {
    switch (priority) {
        case TaskPriority.LOW:
            return 'bg-b-green';
        case TaskPriority.MEDIUM:
            return 'bg-b-yellow';
        case TaskPriority.HIGH:
            return 'bg-b-red';
        case TaskPriority.URGENT:
            return 'bg-b-red';
        default:
            return 'bg-black';
    }
})
</script>

<template>
    <div class="flex items-center gap-2">
        <div :class="['size-3 rounded-full', priorityColorClass]"></div>
        <Flame v-if="priority === TaskPriority.URGENT" class="size-4" />
        <span v-if="!hideLabel">{{ $t(`priorities.${priority}`) }} {{ $t('priority') }}</span>
    </div>
</template>