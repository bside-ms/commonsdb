<script setup lang="ts">
import { Toaster } from './components/ui/sonner';

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - B-Side Commons` : 'B-Side Commons';
  }
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <Toaster />
    </ClientOnly>
  </div>
</template>
