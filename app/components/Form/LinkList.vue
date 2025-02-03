<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FieldArray } from 'vee-validate';

interface LinkListProps {
    name: string;
    loading?: boolean;
}
const { name } = defineProps<LinkListProps>();
</script>

<template>
    <div class="mt-4 space-y-4">
        <FieldArray v-slot="{ fields, push, remove }" :name="name">
            <div v-if="fields?.length" class="grid gap-2 grid-cols-12">
                <template v-for="(field, index) in fields" :key="`links-${field.key}`">
                    <input type="hidden" :name="`${name}[${index}].id`" />
                    <FormField v-slot="{ componentField }" :name="`${name}[${index}].label`">
                        <FormItem class="col-span-full md:col-span-5">
                            <FormLabel class="text-xs">Label</FormLabel>
                            <FormControl>
                                <Input v-bind="componentField" :disabled="loading" />
                            </FormControl>
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`${name}[${index}].url`">
                        <FormItem class="col-span-full md:col-span-5">
                            <FormLabel class="text-xs">Url</FormLabel>
                            <FormControl>
                                <Input v-bind="componentField" :disabled="loading" />
                            </FormControl>
                            <FormMessage class="text-xs" />
                        </FormItem>
                    </FormField>
                    <div class="col-span-full md:col-span-2">
                        <Button variant="ghost" size="icon" class="md:mt-8" @click="remove(index)">
                            <Minus class="w-4 h-4" />
                        </Button>
                    </div>
                </template>
            </div>

            <Button type="button" variant="ghost" size="sm" @click="push({ label: '', url: '' })">
                <Plus class="w-4 h-4 mr-1" /> Link hinzufügen
            </Button>
        </FieldArray>

    </div>
</template>