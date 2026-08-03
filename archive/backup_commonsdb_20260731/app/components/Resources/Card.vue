<script setup lang="ts">
import { Card } from '../ui/card';

defineProps<{
    resource: {
        name: string;
        cover: string;
        booking?: {
            unit: string;
            price: {
                value: number;
                currency: "euro" | "reproduction"
            }
        }
    }
}>()
</script>

<template>
    <Card class="group">
        <div class="overflow-hidden">
            <img :src="resource.cover" :alt="resource.name" :class="[
                'h-auto w-auto object-cover transition-all group-hover:scale-105 aspect-[4/3]',
            ]">
        </div>
        <CardFooter class="pt-4">
            <div class="space-y-1 text-sm">
                <h3 class="font-medium leading-none">
                    {{ resource.name }}
                </h3>
                <p v-if="resource.booking" class="text-xs text-muted-foreground">
                    {{ resource.booking }}
                </p>
            </div>
        </CardFooter>
    </Card>
</template>