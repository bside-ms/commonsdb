<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
</script>

<template>
    <ActionContainer>
        <div class="space-y-1">
            <h2 class="text-2xl font-semibold tracking-tight">
                Qualifications
            </h2>
            <p class="text-sm text-muted-foreground">
                Hier siehst du eine Liste von Bedingungen, die z.B. erfüllt sein müssen, um eine Ressource zu buchen.
            </p>
        </div>
        <Separator class="my-4" />

        <div class="grid sm:grid-cols-2 gap-2 md:gap-4">

        </div>

        <template #actions>
            <Button size="icon" as-child>
                <NuxtLink to="/app/qualifications/create">
                    <Plus class="w-6 h-6" />
                </NuxtLink>
            </Button>
        </template>
    </ActionContainer>
</template>