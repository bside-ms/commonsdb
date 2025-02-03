<script setup lang="ts">
import type { Task } from '@prisma/client';
import type { PaginatedResult } from '~/types';

const { appliedFilter, apply: applyFilter } = useQueryFilter();
const { data } = await useAsyncData(
    'tasks',
    () => $fetch<PaginatedResult<Task>>('/api/tasks', {
        query: {
            filter: appliedFilter.value
        }
    }),
    { watch: [appliedFilter] }
);

const tasks = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.totalCount ?? 0);

const onFilterChanged = (field: string, values: string[]) => {
    applyFilter(field, values);
}
</script>

<template>
    <Container>
        <Headline>Aufgaben</Headline>
        <div class="grid gap-6 grid-cols-12">
            <div class="space-y-3 col-span-full lg:col-span-9">
                <div class="flex items-center justify-between">
                    <div class="flex gap-2">
                        <TaskFilterType @filter:changed="(values) => onFilterChanged('type', values)" />
                        <TaskFilterPriority @filter:changed="(values) => onFilterChanged('priority', values)" />
                    </div>
                    <TaskSort />
                </div>
                <TaskList :tasks="tasks" />
                <div class="mt-8 text-sm text-destructive">Todo: Paginierung</div>
            </div>
            <div class="col-span-full md:col-span-3">
                <p class="text-destructive">Todo: Legende</p>
            </div>
        </div>
    </Container>
</template>