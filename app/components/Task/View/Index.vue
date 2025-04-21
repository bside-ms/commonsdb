<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import type { Task, TaskLink, TaskOccurrence } from '~/types/tasks';

interface TaskViewProps {
    task: Task & { occurrences: TaskOccurrence[] } & { links: TaskLink[] };
}
const { task } = defineProps<TaskViewProps>();
</script>

<template>
    <div>
        <TaskTitle>{{ task.title }}</TaskTitle>
        <div class="flex flex-col gap-6 px-2">
            <div class="space-y-8">
                <TaskInfo :task="task" />
                <div v-if="task.description?.length">
                    <div class="text-xl font-serif font-semibold mb-3">Aufgabenbeschreibung</div>
                    <div class="prose" v-html="task.description" />
                </div>
                <div v-if="task.links?.length">
                    <div class="text-xl font-serif font-semibold mb-3">Links</div>
                    <ul class="space-y-2">
                        <li v-for="link in task.links">
                            <NuxtLink :to="link.url" target="_blank" external class="flex gap-1 items-center">
                                <span>{{ link.label }}</span>
                                <ExternalLink class="size-3" />
                            </NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>

            <slot />

            <div class="hidden lg:block">
                <Button variant="outline" @click="$router.back()">
                    {{ $t("actions.back") }}
                </Button>
            </div>
        </div>
    </div>
</template>