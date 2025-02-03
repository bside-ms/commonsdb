<script setup lang="ts">
import { Button } from '../ui/button';
</script>

<template>
    <div class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-3">
            <Headline size="sm" text-align="left" class="mb-2">Reprostunden-Konto</Headline>
            <div class="px-2 space-y-2">
                <WalletBalance />
                <Button variant="outline" size="sm" as-child>
                    <NuxtLink to="/account/wallet">Ansehen</NuxtLink>
                </Button>
            </div>
        </div>
        <div class="lg:col-span-6">
            <Headline size="sm" text-align="left" class="mb-2">Deine Aufgaben</Headline>
            <AccountTaskList />
        </div>
    </div>
</template>