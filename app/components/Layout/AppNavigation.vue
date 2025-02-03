<script setup lang="ts">
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
</script>

<template>
    <NavigationMenu>
        <NavigationMenuList>
            <NavigationMenuItem>
                <NuxtLink to="/app/tasks">
                    <NavigationMenuLink :class="navigationMenuTriggerStyle()">
                        Aufgaben
                    </NavigationMenuLink>
                </NuxtLink>
            </NavigationMenuItem>
        </NavigationMenuList>
    </NavigationMenu>
</template>