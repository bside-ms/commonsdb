<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-vue-next'
import { toast } from '~/components/ui/toast';
import type { Task } from '@prisma/client'

const { task } = defineProps<{
    task: Task
}>()
const emit = defineEmits(["row:edit", "row:copy", "row:deleted"])

const loading = ref(false);
const onDelete = async () => {
    if (!task.id) return

    const { id } = task
    try {
        // await GqlDeleteTask({
        //     id
        // })

        toast({
            title: `${task.title}`,
            description: 'Erfolgreich gelöscht.',
        });

        emit('row:deleted')
    } catch (error) {
        console.log(error)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="w-8 h-8 p-0">
                <span class="sr-only">Open menu</span>
                <MoreHorizontal class="w-4 h-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem @click="() => emit('row:edit', task)">Editieren</DropdownMenuItem>
            <DropdownMenuItem @click="() => emit('row:copy', task)">Kopieren</DropdownMenuItem>
            <DropdownMenuItem class="text-destructive" @click="onDelete">Löschen</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</template>