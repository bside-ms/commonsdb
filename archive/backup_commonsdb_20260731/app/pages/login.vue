<script setup lang="ts">
import { Button } from '~/components/ui/button';

definePageMeta({
    layout: false
})
</script>

<template>
    <div class="min-h-screen w-screen grid place-content-center">
        <div class="container">
            <Logo />
            <Button class="mt-8" as-child>
                <a href="/auth/keycloak">Mit B-Side Account anmelden</a>
            </Button>
        </div>
    </div>
</template>