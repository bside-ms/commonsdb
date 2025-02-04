<script setup lang="ts">
import { TaskType } from '@prisma/client';
import { ExternalLink } from 'lucide-vue-next';
import type { TaskFull } from '~/types/tasks';

defineProps<{ task: TaskFull }>()
</script>

<template>
    <div class="space-y-3">
        <div v-if="task.categories.length || task.type === TaskType.RECURRING" class="font-serif font-semibold">
            {{ task.categories.map(tc => tc.category.name).join(", ") }}{{ task.categories.length ? " " : "" }}{{
                task.type === TaskType.RECURRING ? " " +
                    $t(`tasks.type.${task.type}`) : "" }}
        </div>
        <ul class="space-y-px">
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