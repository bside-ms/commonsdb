<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskActionsProps {
    task: TaskWithOccurrences;
    refresh: () => Promise<void>;
}
const { task, refresh } = defineProps<TaskActionsProps>();

const { isOpen: isSettleDialogOpen, closeDialog: closeSettleDialog } = useDialog()
const onSettle = async () => {
    await refresh();
    closeSettleDialog();

}

const { isOpen: isEditSheetOpen, closeDialog: closeEditSheet } = useDialog()
const onSubmitEdit = async () => {
    await refresh();
    closeEditSheet();
}
</script>

<template>
    <div>
        <div class="flex gap-4 lg:flex-col">
            <AdminTaskActionsEditSheet v-model:open="isEditSheetOpen" :task="task" @submit="onSubmitEdit"
                @cancel="closeEditSheet" />
            <AdminTaskActionsSettleDialog v-model:open="isSettleDialogOpen" :task="task" @submit="onSettle" />
        </div>
    </div>
</template>