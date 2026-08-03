<script setup lang="ts">
import { ChevronsUpDown } from 'lucide-vue-next';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const { user } = await useUserSession();

const { isMobile } = useSidebar()
</script>

<template>
    <SidebarMenu>
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                        <Avatar class="h-8 w-8 rounded-lg">
                            <!-- <AvatarImage src="https://api.dicebear.com/9.x/adventurer-neutral/svg"
                                :alt="user?.username" /> -->
                            <AvatarFallback class="text-white bg-black">
                                {{ user?.firstname?.charAt(0) }}
                            </AvatarFallback>
                        </Avatar>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-semibold">{{ user?.firstname }}</span>
                            <span class="truncate text-xs">{{ user?.username }}</span>
                        </div>
                        <ChevronsUpDown class="ml-auto size-4" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    :side="isMobile ? 'bottom' : 'right'" align="end" :side-offset="4">
                    <DropdownMenuLabel class="p-0 font-normal">
                        <UserListItem :user="user" />
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem as-child>
                            <NuxtLink to="/wallet">
                                Einstellungen
                            </NuxtLink>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuGroup>
                        <DropdownMenuItem as-child>
                            <NuxtLink to="/wallet">
                                Reprostunden-Konto
                            </NuxtLink>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as-child>
                        <a href="/auth/logout">
                            Abmelden
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>
</template>