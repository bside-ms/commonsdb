<script setup lang="ts">
import { Home, Hammer, PiggyBank, Handshake, CakeSlice, Award } from "lucide-vue-next"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    type SidebarProps,
} from "@/components/ui/sidebar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'

defineProps<SidebarProps>()

interface NavigationItem {
    title: string;
    url: string
}
const navigation: Array<{
    title: string; icon: any; subNavigation: {
        title: string;
        url: string
    }[]
} | {
    title: string; url: string; icon: any;
}>
    = [
        {
            title: "Home",
            url: "/",
            icon: Home,
        },
        {
            title: "Initiativen",
            url: "/organizations/memberships",
            icon: Handshake,
        },
        {
            title: "Aufgaben",
            url: "/tasks",
            icon: Hammer,
        },
        {
            title: "Ressourcen",
            url: "/resources",
            icon: CakeSlice,
        },
        {
            title: "Qualifikationen",
            url: "/qualifications",
            icon: Award,
        },
        {
            title: "Reprostunden",
            url: "/wallet",
            icon: PiggyBank,
        },
    ];
</script>

<template>
    <Sidebar collapsible="icon">
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>B-Side Commons</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <template v-for="navItem in navigation" :key="navItem.title">
                            <SidebarMenuItem v-if="!navItem.subNavigation">
                                <SidebarMenuButton as-child>
                                    <NuxtLink :to="navItem.url">
                                        <component :is="navItem.icon" />
                                        <span>{{ navItem.title }}</span>
                                    </NuxtLink>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <Collapsible v-else default-open class="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger as-child>
                                        <SidebarMenuButton>
                                            <component :is="navItem.icon" />
                                            <span>{{ navItem.title }}</span>
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            <SidebarMenuSubItem v-for="subNavItem in navItem.subNavigation">
                                                <SidebarMenuSubButton as-child>
                                                    <NuxtLink :to="subNavItem.url">
                                                        <span>{{ subNavItem.title }}</span>
                                                    </NuxtLink>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </template>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <UserNavigation />
        </SidebarFooter>
    </Sidebar>
</template>