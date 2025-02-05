<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
      <Button>
        Aufgabe bearbeiten
      </Button>
    </SheetTrigger>
    <SheetContent class="max-h-screen overflow-y-auto w-full max-w-[400px] sm:max-w-[540px] lg:max-w-[680px]">
      <SheetHeader>
        <SheetTitle>Aufgabe editieren</SheetTitle>
      </SheetHeader>
      <div class="grid gap-4 py-4">
        <AdminTaskForm v-bind="$attrs" />
      </div>
    </SheetContent>
  </Sheet>
</template>