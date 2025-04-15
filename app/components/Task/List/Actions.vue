<script setup lang="ts">
const { isAdminUser } = useUser();
</script>

<template>
    <div>
        <div class="grid gap-4">
            <template v-if="isAdminUser">
                <Button as-child>
                    <NuxtLink to="/tasks/create">{{ $t('tasks.actions.create') }}</NuxtLink>
                </Button>
            </template>
        </div>
    </div>
</template>