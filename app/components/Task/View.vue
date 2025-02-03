<script setup lang="ts">
import { Button } from '~/components/ui/button';
import type { TaskFull } from '~/types/tasks';

interface TaskViewProps {
    task: TaskFull;
}
const { task } = defineProps<TaskViewProps>();

const { getDueEndDateFormatted } = useTask()
</script>

<template>
    <div>
        <TaskTitle>{{ task.title }}</TaskTitle>
        <div class="flex flex-col gap-6 px-2">
            <TaskInfo :task="task" />
            <slot />
            <div class="hidden lg:block">
                <Button variant="outline" @click="$router.back()">
                    {{ $t("actions.back") }}
                </Button>
            </div>
        </div>
    </div>
</template>