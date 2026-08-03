<script setup lang="ts">
import { Separator } from '~/components/ui/separator';
import { Calendar } from '~/components/ui/calendar';
import { type DateValue, getLocalTimeZone, today, DateFormatter } from '@internationalized/date'
import type { PaginatedResult } from '~/types';
import type { TaskOccurrence, WithTask } from '~/types/tasks';

const title = usePageTitle();
title.value = "Aufgaben";
useSeoMeta({
    title
})

const dateValue = ref(today(getLocalTimeZone())) as Ref<DateValue>
const { appliedSort, apply: applySort } = useQuerySort();
const { appliedFilter, apply: applyFilter } = useQueryFilter();
const { status, data } = await useAsyncData(
    'task-occurrences',
    () => $fetch<PaginatedResult<TaskOccurrence & WithTask>>('/api/tasks/occurrences', {
        query: {
            filter: appliedFilter.value,
            sort: appliedSort.value
        }
    }),
    { watch: [appliedFilter, appliedSort], server: false }
);

const taskOccurrences = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.totalCount ?? 0);

const onFilterChanged = (field: string, values: string[]) => {
    applyFilter(field, values);
}
const onSortChanged = (sort: string) => {
    applySort([sort]);
}
</script>

<template>
    <div class="space-y-4">
        <div class="flex flex-col gap-6 lg:flex-row-reverse">
            <div class="space-y-4">
                <Calendar v-model="dateValue" locale="de" :weekday-format="'short'" class="border" />
                <TaskListActions />
            </div>
            <div class="flex-1">
                <Separator :label="new DateFormatter('de-DE', {
                    dateStyle: 'full'
                }).format(dateValue.toDate('Europe/Berlin'))" class="mb-8" />
                <TaskList :task-occurrences="taskOccurrences" :loading="status === 'idle'" />
            </div>
        </div>
    </div>
    <!-- <div class="grid gap-6 grid-cols-12">
        <div class="space-y-3 col-span-full lg:col-span-9"> -->
    <!-- <div class="flex items-center justify-between">
                <div class="flex gap-2">
                    <TaskFilterType @filter:changed="(values) => onFilterChanged('type', values)" />
                    <TaskFilterPriority @filter:changed="(values) => onFilterChanged('priority', values)" />
                </div>
                <TaskSort @sort:changed="onSortChanged" />
            </div> -->
    <!-- <TaskList :tasks="tasks" :loading="status === 'idle'" />
            <div class="mt-8 text-sm text-destructive">Todo: Paginierung</div>
        </div>
        <div class="col-span-full md:col-span-3">
            <TaskListActions />
        </div>
    </div> -->
</template>