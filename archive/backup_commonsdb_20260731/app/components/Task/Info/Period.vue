<script setup lang="ts">
import { Calendar } from 'lucide-vue-next';
import { DateTime } from 'luxon';
import type { TaskOccurrence } from '~/types/tasks';

interface TaskPeriodProps {
    taskOccurrence: TaskOccurrence
}
const { taskOccurrence } = defineProps<TaskPeriodProps>()

const periodHtml = computed(() => {
    const now = DateTime.now();
    const dueStartDateTime = taskOccurrence.dueStartDate ?
        DateTime.fromISO(taskOccurrence.dueStartDate).isValid
            ? DateTime.fromISO(taskOccurrence.dueStartDate).setLocale("de")
            : DateTime.fromSQL(taskOccurrence.dueStartDate).setLocale("de") : null;
    const dueEndDateTime = taskOccurrence.dueEndDate ?
        DateTime.fromISO(taskOccurrence.dueEndDate).isValid
            ? DateTime.fromISO(taskOccurrence.dueEndDate).setLocale("de")
            : DateTime.fromSQL(taskOccurrence.dueEndDate).setLocale("de") : null;

    if (!dueStartDateTime && !dueEndDateTime) {
        return "ab sofort"
    }

    if (dueEndDateTime) {
        if (!dueStartDateTime || dueStartDateTime < now) {
            return `Bis ${dueEndDateTime.weekdayLong}, ${dueEndDateTime.toLocaleString()} um ${dueEndDateTime.toFormat("HH:mm")} Uhr`
        }

        if (dueEndDateTime.diff(dueStartDateTime, ['days']).days === 0) {
            return `${dueStartDateTime.weekdayLong} zwischen ${dueStartDateTime.toFormat("HH:mm")} Uhr und ${dueEndDateTime.toFormat("HH:mm")} Uhr`
        }

        return `zwischen ${dueStartDateTime.weekdayLong}, ${dueStartDateTime.toLocaleString()} ${dueStartDateTime.toFormat("HH:mm")} Uhr und <span>${dueEndDateTime.weekdayLong}, ${dueEndDateTime.toLocaleString()} ${dueEndDateTime.toFormat("HH:mm")} Uhr</span>`
    }

    return null;
})
</script>

<template>
    <div v-if="periodHtml" class="flex items-center gap-2">
        <Calendar class="size-3" />
        <p v-html="periodHtml"></p>
    </div>
</template>