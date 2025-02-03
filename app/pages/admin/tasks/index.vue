<script setup lang="ts">
import type { Task } from '@prisma/client';
import type { PaginatedResult } from '~/types';

const { appliedFilter, apply: applyFilter } = useQueryFilter();
const { data, execute } = await useAsyncData(
    'tasks',
    () => $fetch<PaginatedResult<Task>>('/api/admin/tasks', {
        query: {
            filter: appliedFilter.value
        }
    }),
    { watch: [appliedFilter] }
);
await execute();

const tasks = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.totalCount ?? 0);

const onFilterChanged = (field: string, values: string[]) => {
    applyFilter(field, values);
}
</script>

<template>
    <div class="grid lg:grid-cols-6">
        <div class="space-y-3 lg:col-span-4">
            <div class="flex items-center justify-between">
                <div class="flex gap-2">
                    <TaskFilterAssignmentStatus
                        @filter:changed="(values) => onFilterChanged('assignmentStatus', values)" />
                    <TaskFilterType @filter:changed="(values) => onFilterChanged('type', values)" />
                    <TaskFilterPriority @filter:changed="(values) => onFilterChanged('priority', values)" />
                </div>
                <TaskSort />
            </div>
            <AdminTaskList :tasks="tasks" />

        </div>
        <div class="col-span-full mt-8 text-sm text-destructive">Todo: Paginierung</div>
    </div>
</template>