<script setup lang="ts">
import type { Task } from '@prisma/client';

interface AdminTaskListProps {
    tasks: Task[]
}
defineProps<AdminTaskListProps>()
</script>

<template>
    <div class="-my-4 divide-y divide-gray-200">
        <template v-for="task in tasks">
            <TaskListItem :task="task" scope="ADMIN" class="py-4" />
        </template>
    </div>
</template>