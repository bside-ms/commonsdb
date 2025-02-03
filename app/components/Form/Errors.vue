<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export type FormError = {
    title: string;
    description?: string;
}

defineProps<{ errors: { title: string; description?: string }[] }>()
</script>

<template>
    <div v-if="errors && errors.length" class="flex flex-col gap-2">
        <template v-for="{ title, description } in errors">
            <Alert variant="destructive">
                <AlertCircle class="w-4 h-4" />
                <AlertTitle>{{ title }}</AlertTitle>
                <AlertDescription v-if="description">{{ description }}</AlertDescription>
            </Alert>
        </template>
    </div>
</template>