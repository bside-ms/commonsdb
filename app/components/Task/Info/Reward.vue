<script setup lang="ts">
import type { Task } from '@prisma/client';
import { Currency } from 'lucide-vue-next';

interface TaskRewardProps {
    task: Task
}
defineProps<TaskRewardProps>()
</script>

<template>
    <div v-if="task.expense" class="flex items-center gap-2">
        <Currency class="size-3" />
        <span>{{ useFormatReproduction(task.expense * (task.factor ?? 1), { showUnit: true }) }}</span>
    </div>
</template>