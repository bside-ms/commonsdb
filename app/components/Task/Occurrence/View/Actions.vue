<script setup lang="ts">
import { DateTime } from 'luxon';
import { toast } from 'vue-sonner';
import { type Task, type TaskOccurrence, type WithOccurrences, type WithResponsibleUsers } from '~/types/tasks';

interface TaskOccurrenceViewActionsProps {
    taskOccurrence: TaskOccurrence;
    refresh: () => Promise<void>;
}
const { taskOccurrence, refresh } = defineProps<TaskOccurrenceViewActionsProps>();

const loading = ref(false);

const { user } = useUserSession()
const isUserAssigned = computed(() => {
    // TODO
    return true;
})
const canSettle = computed(() => {
    if (!taskOccurrence?.dueEndDate) {
        return true;
    }

    const now = DateTime.now()
    const dueEndDateTime = getDateTimeObject(taskOccurrence.dueEndDate);

    if (taskOccurrence?.dueStartDate) {
        const dueStartDateTime = getDateTimeObject(taskOccurrence.dueStartDate);
        return dueStartDateTime <= now && dueEndDateTime >= now;
    }

    if (taskOccurrence?.dueEndDate) {
        return dueEndDateTime >= now;
    }

    return false;
})
const onSettle = async () => {
    if (!taskOccurrence) {
        return;
    }

    loading.value = true;
    try {
        await $fetch(`/api/tasks/${taskOccurrence.taskId}/settle`, {
            method: "POST",
            body: {
                taskOccurrenceId: taskOccurrence.id
            }
        })
        toast("🎉 Yay 🥳", {
            description: "Du hast die Aufgabe erledigt."
        })
        await navigateTo("/");
    } catch (error) {
        console.log(error);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div>
        <div class="flex gap-4 lg:flex-col">
            <Button variant="outline" size="sm" class="lg:hidden" @click="$router.back()">
                {{ $t("actions.back") }}
            </Button>
            <template v-if="isUserAssigned">
                <Button size="sm" @click="onSettle" :disabled="loading || !canSettle">{{
                    $t("tasks.actions.settle")
                }}</Button>
            </template>
        </div>
    </div>
</template>