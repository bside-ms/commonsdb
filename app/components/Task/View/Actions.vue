<script setup lang="ts">
import { DateTime } from 'luxon';
import { toast } from 'vue-sonner';
import type { TaskFull, TaskWithOccurrences } from '~/types/tasks';

interface TaskActionsProps {
    task: TaskFull;
    refresh: () => Promise<void>;
}
const { task, refresh } = defineProps<TaskActionsProps>();

const loading = ref(false);
const { getNextOccurrence } = useTask()
const nextOccurrence = getNextOccurrence(task as TaskWithOccurrences);

// @ts-ignore
const canAccept = computed(() => (task.maxResponsibilities ?? 0) > task._count.responsibilities)
const onAccept = async () => {
    loading.value = true;

    try {
        await $fetch(`/api/tasks/${task.id}/accept`)
        toast("Aufgabe angenommen", {
            description: "Danke, dass du Teil der B-Side bist."
        })
        await refresh();
    } catch (error) {
        console.log(error);
    } finally {
        loading.value = false;
    }
}

const { user } = useUserSession()
const isUserResponsible = computed(() =>
    task.responsibilities?.some(r => r.userId === user.value?.id)
)
const canSettle = computed(() => {
    if (!nextOccurrence?.dueEndDate) {
        return true;
    }

    const now = DateTime.now()
    const dueEndDateTime = DateTime.fromISO(nextOccurrence.dueEndDate.toString());

    if (nextOccurrence?.dueStartDate) {
        const dueStartDateTime = DateTime.fromISO(nextOccurrence.dueStartDate.toString());
        return dueStartDateTime <= now && dueEndDateTime >= now;
    }

    if (nextOccurrence?.dueEndDate) {
        return dueEndDateTime >= now;
    }

    return false;
})
const onSettle = async () => {
    if (!nextOccurrence) {
        return;
    }

    loading.value = true;
    try {
        await $fetch(`/api/tasks/${task.id}/settle`, {
            method: "POST",
            body: {
                taskOccurrenceId: nextOccurrence.id
            }
        })
        toast("🎉 Yay 🥳", {
            description: "Du hast die Aufgabe erledigt."
        })
        await navigateTo("/tasks");
    } catch (error) {
        console.log(error);
    } finally {
        loading.value = false;
    }
}

const onResign = async () => {
    await $fetch(`/api/tasks/${task.id}/resign`, {
        method: "POST",
    })
    toast("Von Aufgabe zurückgetreten", {
        description: "Du bist nicht mehr für diese Aufgabe verantwortlich."
    })
    await navigateTo("/tasks");
}
</script>

<template>
    <div>
        <div class="flex gap-4 lg:flex-col">
            <Button variant="outline" size="sm" class="lg:hidden" @click="$router.back()">
                {{ $t("actions.back") }}
            </Button>
            <template v-if="!isUserResponsible">
                <Button @click="onAccept" :disabled="loading || !canAccept">{{
                    $t("tasks.actions.accept")
                }}</Button>
            </template>
            <template v-else>
                <Button size="sm" @click="onSettle" :disabled="loading || !canSettle">{{
                    $t("tasks.actions.settle")
                }}</Button>
                <Button size="sm" variant="destructive" @click="onResign" :disabled="loading">{{
                    $t("tasks.actions.resign")
                }}</Button>
            </template>
        </div>
    </div>
</template>