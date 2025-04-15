<script setup lang="ts">
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import AppSidebar from '~/components/AppSidebar.vue';

const title = usePageTitle()
</script>

<template>
    <SidebarProvider :defaultOpen="false">
        <AppSidebar />
        <SidebarInset>
            <header class="flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger class="-ml-1" />
                <Separator orientation="vertical" class="mr-2 h-4" />
                <div v-if="title?.length">
                    <h1 class="font-serif font-semibold text-lg tracking-wide">{{ title }}</h1>
                </div>
            </header>
            <main class="flex flex-1 flex-col gap-4 px-4 py-8">
                <slot />
            </main>
        </SidebarInset>
    </SidebarProvider>
</template>