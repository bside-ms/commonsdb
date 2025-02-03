<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../ui/card';

const { walletBalance } = useUser()
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>Reprostunden-Konto</CardTitle>
            <CardDescription>Mit Reprostunden kannst du die B-Side Commons nutzen</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="text-3xl font-semibold flex items-end gap-2">
                {{ useFormatReproduction(walletBalance ?? 0) }}
                <span class="text-xs pb-1">Repros</span>
            </div>
        </CardContent>
        <CardFooter class="flex justify-end px-6 pb-6">
            <Button variant="ghost" class="flex items-center gap-2">
                <span>Transaktionen</span>
                <ArrowRight class="size-4" />
            </Button>
        </CardFooter>
    </Card>
</template>