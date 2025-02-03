<script setup lang="ts">
import { useForm } from 'vee-validate';
import type { TaskWithOccurrences, TaskWithResponsibilities } from '~/types/tasks';

const { task } = defineProps<{
    task: TaskWithOccurrences & TaskWithResponsibilities;
    disabled?: boolean
}>();
const emit = defineEmits(['submit'])

const loading = ref(false);

const { getNextPendingOccurrence } = useTask()
const nextOpenOccurrence = getNextPendingOccurrence(task as TaskWithOccurrences);

const { handleSubmit, values, setFieldValue } = useForm({
    initialValues: {
        responsibles: task.responsibilities?.map(r => ({ value: r.userId, label: `${r.user.username} (${r.user.email})` }))
    }
})
const onSubmit = handleSubmit(async (values) => {
    if (!nextOpenOccurrence) {
        return;
    }

    loading.value = true;

    try {
        await useFetch(`/api/admin/tasks/${task.id}/settle`, {
            method: "POST",
            body: {
                taskOccurrenceId: nextOpenOccurrence.id,
                userIds: values.responsibles.map(r => r.value)
            }
        })

        emit("submit")
    } catch (error) {
        console.log(error);
    } finally {
        loading.value = false;
    }
})
</script>

<template>
    <Dialog>
        <DialogTrigger as-child>
            <Button size="sm" :disabled="disabled || !nextOpenOccurrence">{{
                $t("tasks.actions.settle")
            }}</Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Aufgabe erledigt?</DialogTitle>
                <DialogDescription>
                    <p>
                        Wähle Menschen oder Organisationen aus, denen die Repros gutgeschrieben werden.
                    </p>
                    <p class="text-destructive">Wählst du niemanden aus, wird die Aufgabe trotzdem als erledigt
                        markiert.</p>
                </DialogDescription>
            </DialogHeader>
            <form @submit="onSubmit">
                <div class="grid gap-4 py-4">
                    <FormField v-slot="{ value }" name="responsibles">
                        <FormItem class="grid gap">
                            <FormLabel>Personen oder Initiativen</FormLabel>
                            <FormTagsCombobox name="responsibles" :form-values="values" :set-field-value="setFieldValue"
                                placeholder="Person oder Organisation..." :fetch-suggestions="async () => {
                                    const { data } = await useFetch('/api/admin/users')
                                    return data.value?.map(u => ({ value: u.id, label: `${u.username} (${u.email})` })) ?? []
                                }" :disabled="loading" />
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                </div>
                <DialogFooter>
                    <Button type="submit">
                        Absenden
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>