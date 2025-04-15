<script setup lang=ts>
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/components/ui/sidebar'
import {
    ChevronsUpDown,
    LogOut,
    Plus,
    Sparkles,
} from 'lucide-vue-next'
import { Button } from '../ui/button'

const { user } = useUserSession();
</script>

<template>
    <SidebarProvider>
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Module</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Aufgaben" as-child>
                                <div class="flex justify-between">
                                    <NuxtLink to="/admin/tasks" class="flex-1">Aufgaben</NuxtLink>
                                    <Button variant="ghost" size="icon" as-child>
                                        <NuxtLink to="/admin/tasks/new">
                                            <Plus class="size-4" />
                                        </NuxtLink>
                                    </Button>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Aufgaben" as-child>
                                <div class="flex justify-between">
                                    <NuxtLink to="/admin/organizations" class="flex-1">Organisationen</NuxtLink>
                                    <Button variant="ghost" size="icon" as-child>
                                        <NuxtLink to="/admin/organizations/new">
                                            <Plus class="size-4" />
                                        </NuxtLink>
                                    </Button>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Aufgaben" as-child>
                                <div class="flex justify-between">
                                    <NuxtLink to="/admin/organizations" class="flex-1">Ressourcen</NuxtLink>
                                    <Button variant="ghost" size="icon" as-child>
                                        <NuxtLink to="/admin/organizations/new">
                                            <Plus class="size-4" />
                                        </NuxtLink>
                                    </Button>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Aufgaben" as-child>
                                <div class="flex justify-between">
                                    <NuxtLink to="/admin/organizations" class="flex-1">Qualifikationen</NuxtLink>
                                    <Button variant="ghost" size="icon" as-child>
                                        <NuxtLink to="/admin/organizations/new">
                                            <Plus class="size-4" />
                                        </NuxtLink>
                                    </Button>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <SidebarMenuButton size="lg"
                                    class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                                    <Avatar class="size-8 rounded-lg">
                                        <AvatarImage src="https://api.dicebear.com/9.x/lorelei/svg?seed=Sarah"
                                            :alt="user?.email" />
                                        <AvatarFallback class="rounded-lg">
                                            BS
                                        </AvatarFallback>
                                    </Avatar>
                                    <div class="grid flex-1 text-left text-sm leading-tight">
                                        <span class="truncate font-semibold">{{ 'username' }}</span>
                                        <span class="truncate text-xs">{{ user?.email }}</span>
                                    </div>
                                    <ChevronsUpDown class="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="bottom" align="end" :side-offset="4">
                                <DropdownMenuGroup>
                                    <DropdownMenuItem as-child>
                                        <NuxtLink to="/" class="flex items-center gap-2">
                                            <Sparkles />
                                            Zur Benutzeransicht
                                        </NuxtLink>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <LogOut />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
        <SidebarInset>
            <header
                class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div class="flex items-center gap-2 px-4">
                    <SidebarTrigger class="-ml-1" />
                    <Separator orientation="vertical" class="mr-2 h-4" />
                    <h1>Title</h1>
                </div>
            </header>
            <div class="flex-1 p-4">
                <slot />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>