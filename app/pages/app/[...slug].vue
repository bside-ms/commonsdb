<script setup lang="ts">
import { AspectRatio } from '~/components/ui/aspect-ratio';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
</script>

<template>
    <Container>
        <div class="grid gap-6 md:grid-cols-12">
            <div class="col-span-full md:col-span-6 xl:col-span-4">
                <Card>
                    <NuxtLink to="/app/tasks">
                        <CardContent>
                            <AspectRatio :ratio="16 / 9" class="-mx-6">
                                <img src="/images/cover/tasks.jpg" alt="unsplash/cover-tasks"
                                    class="object-cover w-full h-full" />
                            </AspectRatio>
                        </CardContent>
                        <CardFooter>
                            <h2 class="text-lg font-medium">Aufgaben</h2>
                        </CardFooter>
                    </NuxtLink>
                </Card>
            </div>
        </div>
    </Container>
</template>