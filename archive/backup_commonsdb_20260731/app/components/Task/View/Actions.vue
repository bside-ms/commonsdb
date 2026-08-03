<script setup lang="ts">
import { toast } from 'vue-sonner';
import { type Task, type WithOccurrences, type WithResponsibleUsers } from '~/types/tasks';

interface TaskActionsProps {
    task: Task & WithOccurrences & WithResponsibleUsers;
    refresh: () => Promise<void>;
}
const { task, refresh } = defineProps<TaskActionsProps>();

const loading = ref(false);

const { user } = useUserSession()
const canAccept = computed(() => !task.responsibleUsers.some(u => u.userId === user.value?.id))
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

const isUserAssigned = computed(() =>
    task.responsibleUsers?.some((u) => u.userId === user.value?.id)
)

const canResign = computed(() => {
    // TODO: check conditions: e.g. not allowed to resign X days before dueStartDate/dueEndDate
    return true;
})
const onResign = async () => {
    await $fetch(`/api/tasks/${task.id}/resign`, {
        method: "POST",
        body: {
            userId: user.value?.id
        }
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
            <template v-if="!isUserAssigned">
                <Button @click="onAccept" :disabled="loading || !canAccept">{{
                    $t("tasks.actions.accept")
                }}</Button>
            </template>
            <template v-else>
                <Button size="sm" variant="destructive" @click="onResign" :disabled="loading || !canResign">{{
                    $t("tasks.actions.resign")
                }}</Button>
            </template>
        </div>
    </div>
</template>