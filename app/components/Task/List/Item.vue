<script setup lang="ts">
import type { TaskWithOccurrences } from '~/types/tasks';

interface TaskListItemProps {
    task: TaskWithOccurrences
    scope?: "USER" | "ADMIN"
}
const { task } = defineProps<TaskListItemProps>()
</script>

<template>
    <Box :title="task.title" :link="`/tasks/${task.id}`">
        <TaskInfo :task="task" />
    </Box>
</template>