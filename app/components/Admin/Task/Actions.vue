<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskActionsProps {
    task: TaskWithOccurrences;
    refresh: () => Promise<void>;
}
const { task, refresh } = defineProps<TaskActionsProps>();

const { isOpen, closeDialog } = useDialog()
const onSettle = async () => {
    await refresh();
    closeDialog();

}
</script>

<template>
    <div>
        <div class="flex gap-4 lg:flex-col">
            <AdminTaskActionsSettleDialog v-model:open="isOpen" :task="task" @submit="onSettle" />
        </div>
    </div>
</template>