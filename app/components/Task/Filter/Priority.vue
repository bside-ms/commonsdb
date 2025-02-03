<script setup lang="ts">
import { TaskPriority } from '@prisma/client';

const { t: $t } = useI18n();

const filter = {
  label: "Priorität",
  items: (Object.keys(TaskPriority) as Array<keyof typeof TaskPriority>).map((key) => ({
    value: key,
    label: $t(`priorities.${key}`)
  }))
}
</script>

<template>
  <TaskFilter field="priority" v-bind="filter" />
</template>