<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { LoadingButton } from '~/components/ui/button';
import type { FormError } from '~/components/Form/Errors.vue';
import { useToast } from '~/components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field';

const { toast } = useToast();

const formSchema = toTypedSchema(z.object({
    name: z.string(),
    description: z.string().optional(),
    introduction: z.object({
        enabled: z.boolean().default(false),
        qualification: z.string().optional(),
        information: z.string().optional(),
    }),
    handoff: z.object({
        enabled: z.boolean().default(false),
        information: z.string().optional(),
    }),
    booking: z.object({
        unit: z.string(),
        min: z.object({
            duration: z.number().nullable().default(0),
        }),
        max: z.object({
            duration: z.number().nullable().default(0),
        }),
        price: z.object({
            value: z.number().nullable().default(0),
            currency: z.string()
        }),
    })
}))

const { handleSubmit, values, setFieldValue } = useForm({
    validationSchema: formSchema,
})

const errors: Ref<FormError[]> = ref([])
const loading = ref(false)
const onSubmit = handleSubmit(async (values) => {
    loading.value = true;

    try {
        console.log(values)
    } catch (err: any) {
        // errors.value.push({
        //     title: err.statusMessage,
        // })
    } finally {
        loading.value = false;
    }
})
</script>

<template>
    <form @submit="onSubmit">
        <div class="grid gap-4">
            <FormField v-slot="{ componentField }" name="name">
                <FormItem class="grid gap">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                        <Input v-bind="componentField" :disabled="loading" />
                    </FormControl>
                    <FormMessage class="text-xs" />
                </FormItem>
            </FormField>
            <FormField v-slot="{ componentField }" name="description">
                <FormItem class="grid gap">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea v-bind="componentField" :disabled="loading" />
                    </FormControl>
                    <FormMessage class="text-xs" />
                </FormItem>
            </FormField>
            <!-- INTRO -->
            <FormField v-slot="{ value, handleChange }" name="introduction.enabled">
                <FormItem class="flex items-center justify-between gap-4">
                    <div class="space-y-0.5">
                        <FormLabel>
                            Introduction
                        </FormLabel>
                        <FormDescription class="text-xs">
                            Benötigt es eine Einführung, um diese Resource zu nutzen?
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch :checked="value" @update:checked="handleChange" :disabled="loading" />
                    </FormControl>
                </FormItem>
            </FormField>
            <template v-if="values.introduction?.enabled">
                <FormField v-slot="{ componentField }" name="introduction.qualification">
                    <FormItem>
                        <FormLabel>
                            Qualification
                        </FormLabel>
                        <FormControl>
                            <Select v-bind="componentField" :disabled="loading">
                                <SelectTrigger>
                                    <SelectValue placeholder="Bitte wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Nicht nötig
                                    </SelectItem>
                                    <SelectItem value="eins">
                                        One
                                    </SelectItem>
                                    <SelectItem value="zwei">
                                        Two
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormControl>
                    </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="introduction.information">
                    <FormItem class="grid gap">
                        <FormLabel>Information</FormLabel>
                        <FormControl>
                            <Textarea v-bind="componentField" :disabled="loading" />
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </template>

            <!-- HANDOFF -->
            <FormField v-slot="{ value, handleChange }" name="handoff.enabled">
                <FormItem class="flex items-center justify-between gap-4">
                    <div class="space-y-0.5">
                        <FormLabel>
                            Handoff
                        </FormLabel>
                        <FormDescription class="text-xs">
                            Bedingungen für die Rückgabe
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch :checked="value" @update:checked="handleChange" :disabled="loading" />
                    </FormControl>
                </FormItem>
            </FormField>
            <template v-if="values.handoff?.enabled">
                <FormField v-slot="{ componentField }" name="handoff.information">
                    <FormItem class="grid gap">
                        <FormLabel>Information</FormLabel>
                        <FormControl>
                            <Textarea v-bind="componentField" :disabled="loading" />
                        </FormControl>
                        <FormMessage class="text-xs" />
                    </FormItem>
                </FormField>
            </template>

            <div class="space-y-2 mt-4">
                <h4 class="text-base">Booking</h4>
                <Separator />
            </div>
            <FormField v-slot="{ componentField }" name="booking.unit">
                <FormItem>
                    <FormLabel>
                        Buchungseinheit
                    </FormLabel>
                    <FormControl>
                        <Select v-bind="componentField" :disabled="loading">
                            <SelectTrigger>
                                <SelectValue placeholder="Bitte wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hours">
                                    Stunden
                                </SelectItem>
                                <SelectItem value="days">
                                    Tage
                                </SelectItem>
                                <SelectItem value="weeks">
                                    Wochen
                                </SelectItem>
                                <SelectItem value="months">
                                    Monate
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            </FormField>

            <FormField v-slot="{ value }" name="booking.min.duration">
                <FormItem>
                    <FormLabel>Minimale Buchungsdauer</FormLabel>
                    <NumberField class="gap-2" :min="0" :model-value="value"
                        @update:model-value="(v) => setFieldValue('booking.min.duration', v)" :disabled="loading">
                        <NumberFieldContent>
                            <NumberFieldDecrement />
                            <FormControl>
                                <NumberFieldInput />
                            </FormControl>
                            <NumberFieldIncrement />
                        </NumberFieldContent>
                    </NumberField>
                    <FormMessage />
                </FormItem>
            </FormField>

            <FormField v-slot="{ value }" name="booking.max.duration">
                <FormItem>
                    <FormLabel>Maximale Buchungsdauer</FormLabel>
                    <NumberField class="gap-2" :min="0" :model-value="value"
                        @update:model-value="(v) => setFieldValue('booking.max.duration', v)" :disabled="loading">
                        <NumberFieldContent>
                            <NumberFieldDecrement />
                            <FormControl>
                                <NumberFieldInput />
                            </FormControl>
                            <NumberFieldIncrement />
                        </NumberFieldContent>
                    </NumberField>
                    <FormMessage />
                </FormItem>
            </FormField>


            <div class="grid gap-4">
                <FormField v-slot="{ value }" name="booking.price.value">
                    <FormItem>
                        <FormLabel>Preis</FormLabel>
                        <NumberField class="gap-2" :min="0" :model-value="value"
                            @update:model-value="(v) => setFieldValue('booking.price.value', v)" :disabled="loading">
                            <NumberFieldContent>
                                <NumberFieldDecrement />
                                <FormControl>
                                    <NumberFieldInput />
                                </FormControl>
                                <NumberFieldIncrement />
                            </NumberFieldContent>
                        </NumberField>
                        <FormMessage />
                    </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="booking.price.currency">
                    <FormItem>
                        <FormLabel>
                            Währung
                        </FormLabel>
                        <FormControl>
                            <Select v-bind="componentField" :disabled="loading">
                                <SelectTrigger>
                                    <SelectValue placeholder="Bitte wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reproduction">
                                        Repros
                                    </SelectItem>
                                    <SelectItem value="days">
                                        Euro
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                </FormField>
            </div>

            <div class="mt-6">
                <LoadingButton type="submit" class="w-full" :disabled="loading">Create</LoadingButton>
            </div>
        </div>
    </form>
</template>