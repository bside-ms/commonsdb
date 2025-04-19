<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod';
import { Separator } from '~/components/ui/separator';
import { Clock } from 'lucide-vue-next';
import { type ComboboxItem } from '~/components/Form/Combobox.vue';
import { linkListSchema } from '~/components/Form/schema';
import { TaskType, TaskPriority, TaskFrequency, type Task } from '@prisma/client'
import type { TaskWithCategories, TaskWithOccurrences } from '~/types/tasks';
import { DateTime } from 'luxon';
import { toast } from 'vue-sonner';
import { Switch } from '~/components/ui/switch';

interface TaskProps {
    task?: TaskWithCategories & TaskWithOccurrences
    loading?: boolean,
}
const { task } = defineProps<TaskProps>()
const emit = defineEmits(['submit', 'cancel'])

const comboboxSchema =
    z.object({
        value: z.string().uuid(),
        label: z.string()
    })
const schema = toTypedSchema(
    z.object({
        id: z.string().uuid().optional(),
        title: z.string(),
        description: z.string().nullable().optional(),
        categories: z.array(comboboxSchema).optional(),
        priority: z.nativeEnum(TaskPriority).nullable(),
        expense: z.number().positive().nullable(),
        factor: z.string().default("1"), // z.union([z.string(), z.number()]).pipe(z.coerce.number()).nullable(),
        links: z.array(linkListSchema).optional(),
        isAssignableToMany: z.boolean().optional(),
        maxResponsibilities: z.number().positive().min(1).optional(),
        // task type
        type: z.nativeEnum(TaskType).default(TaskType.SINGLE).nullable(),
        hasDueDate: z.boolean().default(false),
        due: z.object({
            startDate: z.string().nullable().optional(),
            startTime: z.string().nullable().optional(),
            endDate: z.string().nullable(),
            endTime: z.string().nullable()
        }).optional(),
        // task type 'recurring'
        frequency: z.nativeEnum(TaskFrequency).nullable().optional(),
    }).superRefine((data, ctx) => {
        if (data.type === TaskType.RECURRING) {
            if (!data.frequency) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Pflichtfeld für sich wiederholende Aufgaben.",
                    path: ["frequency"],
                });
            }
            if (!data.due?.endDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Pflichtfeld",
                    path: ["due.endDate"],
                });
            }
            if (!data.due?.endTime) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Pflichtfeld",
                    path: ["due.endTime"],
                });
            }
        }
        if (data.isAssignableToMany && !data.maxResponsibilities) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Pflichtfeld",
                path: ["maxResponsibilities"],
            });
        }
    })
)

const initialDue = computed(() => {
    let due: {
        startDate: string | null,
        startTime: string | null,
        endDate: string | null,
        endTime: string | null,
    } = {
        startDate: null,
        startTime: null,
        endDate: null,
        endTime: null,
    };

    if (!task?.dueEndDate && !task?.dueStartDate) {
        return due
    }

    if (task.dueEndDate) {
        const dueEndDateTime = DateTime.fromISO(task.dueEndDate.toString())
        due = {
            ...due,
            endDate: dueEndDateTime.toFormat("yyyy-LL-dd"),
            endTime: dueEndDateTime.toFormat("HH:mm")
        }
    }
    if (task.dueStartDate) {
        const dueStartDateTime = DateTime.fromISO(task.dueStartDate.toString())
        due = {
            ...due,
            startDate: dueStartDateTime.toFormat("yyyy-LL-dd"),
            startTime: dueStartDateTime.toFormat("HH:mm")
        }
    }

    return due
})

const { errors, values, setFieldValue, handleSubmit } = useForm({
    validationSchema: schema,
    initialValues: {
        ...task,
        categories: task?.categories?.map(tc => ({ value: tc.categoryId, label: tc.category.name })),
        factor: task?.factor?.toString() ?? "1",
        expense: task?.expense ? task.expense / 60 : null,
        hasDueDate: task?.dueEndDate || task?.dueStartDate ? true : false,
        due: initialDue.value
    }
})

const onSubmit = handleSubmit(async (values, props) => {
    const { id, expense, factor, ...taskData } = values

    try {
        const body = {
            ...taskData,
            factor: factor ? Number.parseFloat(factor) : null,
            expense: expense ? expense * 60 : null
        }

        if (id) {
            await useFetch<Task>(`/api/tasks/${id}`, {
                method: "PATCH",
                body
            })
        } else {
            await useFetch<Task>('/api/tasks', {
                method: "POST",
                body
            })
        }

        toast(values?.id ? `Aufgabe bearbeitet` : `Aufgabe erstellt`, {
            description: values?.id ? `Du hast '${values.title}' erfolgreich bearbeitet.` : `Du hast '${values.title}' erstellt.`,
        })

        emit('submit');
    } catch (error) {
        console.log('error creating task', error);
    }
})

const createCategory = async (name: string): Promise<ComboboxItem> => {
    const { data } = await useFetch('/api/tasks/categories', {
        method: "POST",
        body: {
            name
        }
    })

    return {
        value: data.value!.id,
        label: data.value!.name
    }
}

const onTypeCheckedChange = (checked: boolean) => {
    if (checked) {
        setFieldValue('type', TaskType.RECURRING)
        setFieldValue('hasDueDate', true)
        return
    }
    setFieldValue('type', TaskType.SINGLE)
}
</script>

<template>
    <form @submit="onSubmit">
        <input name="id" type="hidden" readonly />
        <div class="grid grid-cols-6 gap-x-2 gap-y-4">
            <div class="col-span-full">
                <FormField v-slot="{ componentField }" name="title">
                    <FormItem class="grid gap">
                        <FormLabel>Titel</FormLabel>
                        <FormControl>
                            <Input v-bind="componentField" :disabled="loading" />
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <FormField name="description">
                    <FormItem class="grid gap">
                        <FormLabel>Beschreibung</FormLabel>
                        <FormControl>
                            <FormTiptapEditor name="description" :form-values="values" :set-field-value="setFieldValue"
                                :disabled="loading" />
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <Separator class="col-span-full my-2" />

            <div class="col-span-full">
                <FormField v-slot="{ value }" name="type">
                    <FormItem class="flex items-center justify-between">
                        <div class="space-y-0.5">
                            <FormLabel class="text-base">
                                Wiederkehrende Aufgabe
                            </FormLabel>
                            <FormDescription>
                                Wird diese Aufgabe in regelmäßigen Abständen fällig?
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch :model-value="value === TaskType.RECURRING"
                                @update:model-value="onTypeCheckedChange" />
                        </FormControl>
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <FormField v-slot="{ value, handleChange }" name="hasDueDate">
                    <FormItem class="flex items-center justify-between">
                        <div class="space-y-0.5">
                            <FormLabel class="text-base">
                                Fälligkeit
                            </FormLabel>
                            <FormDescription>
                                Muss die Aufgabe bis zu einem bestimmten Zeitpunkt erledigt sein?
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch :model-value="value" @update:model-value="handleChange" />
                        </FormControl>
                    </FormItem>
                </FormField>
            </div>

            <template v-if="values.hasDueDate">
                <div class="col-span-full lg:col-span-3">
                    <FormField name="due.startDate">
                        <FormItem class="grid gap">
                            <FormLabel>von (optional)</FormLabel>
                            <FormDatePicker name="due.startDate" placeholder="Datum" :form-values="values"
                                :set-field-value="setFieldValue" :disabled="loading" />
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                </div>

                <div class="col-span-full lg:col-span-3">
                    <FormField v-slot="{ componentField }" name="due.startTime">
                        <FormItem class="grid gap">
                            <FormLabel>&nbsp;</FormLabel>
                            <FormControl>
                                <div class="relative w-full items-center">
                                    <Input v-bind="componentField" placeholder="Uhrzeit" v-maska="'##:##'" class="pl-8"
                                        :disabled="loading" />
                                    <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
                                        <Clock class="size-4 text-muted-foreground opacity-50" />
                                    </span>
                                </div>
                            </FormControl>
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                </div>
                <div class="col-span-full lg:col-span-3">
                    <FormField name="due.endDate">
                        <FormItem class="grid gap">
                            <FormLabel>bis</FormLabel>
                            <FormDatePicker name="due.endDate" placeholder="Datum" :form-values="values"
                                :set-field-value="setFieldValue" :disabled="loading" />
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                </div>

                <div class="col-span-full lg:col-span-3">
                    <FormField v-slot="{ componentField }" name="due.endTime">
                        <FormItem class="grid gap">
                            <FormLabel>&nbsp;</FormLabel>
                            <FormControl>
                                <div class="relative w-full items-center">
                                    <Input v-bind="componentField" placeholder="Uhrzeit" v-maska="'##:##'" class="pl-8"
                                        :disabled="loading" />
                                    <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
                                        <Clock class="size-4 text-muted-foreground opacity-50" />
                                    </span>
                                </div>
                            </FormControl>
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                </div>
            </template>

            <div v-if="values.type === TaskType.RECURRING" class="col-span-full">
                <FormField v-slot="{ componentField }" name="frequency">
                    <FormItem>
                        <FormLabel>Rhythmus</FormLabel>
                        <Select v-bind="componentField">
                            <FormControl>
                                <SelectTrigger class="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem :value="TaskFrequency.IRREGULAR">
                                        unregelmäßig
                                    </SelectItem>
                                    <SelectItem :value="TaskFrequency.WEEKLY">
                                        wöchentlich
                                    </SelectItem>
                                    <SelectItem :value="TaskFrequency.MONTHLY">
                                        monatlich
                                    </SelectItem>
                                    <SelectItem :value="TaskFrequency.QUARTERLY">
                                        quartalsweise
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div v-if="task?.id && task?.type === TaskType.RECURRING" class="col-span-full">
                <p class="text-destructive text-sm">
                    Änderung des Serienstarts oder der Wiederholung kann zu Neugenerierung der Folgetermine führen.
                </p>
            </div>

            <Separator class="col-span-full my-2" />

            <div class="col-span-full">
                <FormField name="categories">
                    <FormItem class="grid gap">
                        <FormLabel>Kategorien</FormLabel>
                        <FormTagsCombobox name="categories" :form-values="values" :set-field-value="setFieldValue"
                            placeholder="Kategorie..." :create="createCategory" :fetch-suggestions="async () => {
                                const { data } = await useFetch('/api/tasks/categories');
                                return data.value?.map(c => ({
                                    value: c.id,
                                    label: c.name
                                })) ?? []
                            }" :disabled="loading" />
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <Separator class="col-span-full my-2" />

            <div class="col-span-full lg:col-span-3">
                <FormField v-slot="{ componentField }" name="expense">
                    <FormItem class="grid gap">
                        <FormLabel>Aufwand</FormLabel>
                        <FormControl>
                            <Input v-bind="componentField" type="number" step="0.5" :disabled="loading" />
                        </FormControl>
                        <FormDescription>in Stunden</FormDescription>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>
            <div class="col-span-full lg:col-span-3">
                <FormField v-slot="{ componentField }" name="factor">
                    <FormItem class="grid gap">
                        <FormLabel>Faktor</FormLabel>
                        <FormControl>
                            <Select v-bind="componentField">
                                <FormControl>
                                    <SelectTrigger class="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="0.5">
                                            0,5x
                                        </SelectItem>
                                        <SelectItem value="1">
                                            1x
                                        </SelectItem>
                                        <SelectItem value="1.5">
                                            1,5x
                                        </SelectItem>
                                        <SelectItem value="2">
                                            2x
                                        </SelectItem>
                                        <SelectItem value="2.5">
                                            2,5x
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <FormField v-slot="{ componentField }" name="priority">
                    <FormItem>
                        <FormLabel>Priorität</FormLabel>
                        <Select v-bind="componentField">
                            <FormControl>
                                <SelectTrigger class="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem :value="TaskPriority.LOW">
                                        niedrig
                                    </SelectItem>
                                    <SelectItem :value="TaskPriority.MEDIUM">
                                        medium
                                    </SelectItem>
                                    <SelectItem :value="TaskPriority.HIGH">
                                        hoch
                                    </SelectItem>
                                    <SelectItem :value="TaskPriority.URGENT">
                                        dringend
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </div>

            <div class="col-span-full">
                <FormField v-slot="{ value, handleChange }" name="isAssignableToMany">
                    <FormItem class="flex items-center justify-between">
                        <div class="space-y-0.5">
                            <FormLabel class="text-base">
                                Gemeinschaftsarbeit
                            </FormLabel>
                            <FormDescription>
                                Benötigt es mehr Menschen für diese Aufgabe?
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch :model-value="value" @update:model-value="handleChange" />
                        </FormControl>
                    </FormItem>
                </FormField>
            </div>
            <template v-if="values.isAssignableToMany">
                <div class="col-span-full lg:col-span-3">
                    <FormField v-slot="{ componentField }" name="maxResponsibilities">
                        <FormItem class="grid gap">
                            <FormLabel>Anzahl Menschen</FormLabel>
                            <FormControl>
                                <Input v-bind="componentField" type="number" :disabled="loading" />
                            </FormControl>
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                </div>
                <div class="hidden lg:block lg:col-span-3">
                </div>
            </template>

            <Separator class="col-span-full my-2" />

            <div class="col-span-full">
                <h5 class="text-sm font-medium leading-none">Links</h5>
                <FormLinkList name="links" :form-values="values" :set-field-value="setFieldValue" />
            </div>
        </div>
        <div class="flex justify-end gap-4 mt-4">
            <Button type="button" variant="outline" @click="emit('cancel')">
                Abbrechen
            </Button>
            <Button type="submit">Absenden</Button>
        </div>
    </form>
</template>