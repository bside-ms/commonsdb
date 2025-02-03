<script setup lang="ts">
import DataTable from '~/components/ui/DataTable.vue';
import { columns } from './columns';
import type { Task } from '@prisma/client'

interface TaskListProps {
    tasks: Task[];
    total: number;
}
defineProps<TaskListProps>()
const emit = defineEmits(["edit", "copy", "refresh"])

const { limit } = usePagination()

const onEdit = (task: Task) => emit("edit", task);
const onCopy = (task: Task) => emit("copy", task);
const onDelete = () => emit("refresh");
</script>

<template>
    <div class="space-y-6">
        <DataTable :columns="columns({ onEdit, onCopy, onDelete })" :data="tasks ?? []" />
        <div class="flex justify-center lg:justify-end">
            <PaginationComposition :total="total" :items-per-page="limit" />
        </div>
    </div>
</template>