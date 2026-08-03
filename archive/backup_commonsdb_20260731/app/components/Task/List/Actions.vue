<script setup lang="ts">
import { Separator } from '~/components/ui/separator';

const { isAdminUser } = useUser();
</script>

<template>
    <div>
        <div class="grid gap-4">
            <template v-if="isAdminUser">
                <Separator label="Admin Actions" />
                <Button as-child>
                    <NuxtLink to="/tasks/create">{{ $t('tasks.actions.create') }}</NuxtLink>
                </Button>
            </template>
        </div>
    </div>
</template>