<script setup lang="ts">
const user = useSupabaseUser()

const { data } = await useFetch('/api/users/me/tasks')
const tasks = computed(() => data.value)
</script>

<template>
    <div>
        <div v-if="tasks?.length" class="space-y-6">
            <ul class="-my-2 divide-y divide-gray-300">
                <li v-for="task in tasks">
                    <AccountTaskListItem :task="task" />
                </li>
            </ul>
        </div>
        <div v-else class="prose px-2">
            <p class="font-light">Du hast aktuell keine Aufgaben.</p>
        </div>
    </div>
</template>