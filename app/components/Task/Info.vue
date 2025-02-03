<script setup lang="ts">
import { TaskType } from '@prisma/client';
import type { TaskFull } from '~/types/tasks';

defineProps<{ task: TaskFull }>()
</script>

<template>
    <div class="space-y-6">
        <div v-if="task.type === TaskType.RECURRING" class="font-serif font-semibold">{{
            $t(`tasks.type.${task.type}`) }}
        </div>
        <ul class="space-y-1">
            <li v-if="task.priority">
                <TaskPriority :priority="task.priority" />
            </li>
            <li>
                <TaskEffort :task="task" />
            </li>
            <li>
                <TaskReward :task="task" />
            </li>
        </ul>
        <div v-if="task.description?.length">
            <div class="text-xl font-serif font-semibold mb-3">Aufgabenbeschreibung</div>
            <div class="prose prose-sm" v-html="task.description" />
        </div>
        <div v-if="task.links?.length">
            <div class="text-xl font-serif font-semibold mb-3">Links</div>
            <ul class="space-y-2">
                <li v-for="link in task.links">
                    <NuxtLink :to="link.url" target="_blank" external class="flex gap-1 items-center">
                        <span>{{ link.label }}</span>
                        <ExternalLink class="size-4" />
                    </NuxtLink>
                </li>
            </ul>
        </div>
    </div>
</template>