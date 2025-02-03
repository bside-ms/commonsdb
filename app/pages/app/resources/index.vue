<script setup lang="ts">
import { Plus } from 'lucide-vue-next';

const resources = [
    {
        name: "Plena Raum",
        cover: "https://images.pexels.com/photos/1181611/pexels-photo-1181611.jpeg?auto=compress&cs=tinysrgb&w=640&dpr=2",
        booking: {
            unit: "hours",
            price: {
                value: 1,
                currency: "reproduction"
            }
        }
    },
    {
        name: "Cargo Bike",
        cover: "https://images.pexels.com/photos/15085112/pexels-photo-15085112/free-photo-of-person-on-bicycle-with-trailer-on-street-in-town.jpeg?auto=compress&cs=tinysrgb&w=640&dpr=2",
        booking: {
            unit: "hours",
            price: {
                value: 0.25,
                currency: "reproduction"
            }
        }
    }
]

</script>

<template>
    <ActionContainer>
        <div class="space-y-1">
            <h2 class="text-2xl font-semibold tracking-tight">
                Resourcen
            </h2>
            <p class="text-sm text-muted-foreground">
                Schaue, was die B-Side zu bieten hat
            </p>
        </div>
        <Separator class="my-4" />

        <div class="grid sm:grid-cols-2 gap-2 md:gap-4">
            <ResourcesCard v-for="resource in resources" :resource="resource" />
        </div>

        <template #actions>
            <Button size="icon" as-child>
                <NuxtLink to="/app/resources/create">
                    <Plus class="w-6 h-6" />
                </NuxtLink>
            </Button>
        </template>
    </ActionContainer>
</template>