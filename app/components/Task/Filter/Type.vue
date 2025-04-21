<script setup lang="ts">
import { TaskType } from '~/types/tasks';

const { t: $t } = useI18n();

const filter = {
  label: "Type",
  items: (Object.keys(TaskType) as Array<keyof typeof TaskType>).map((key) => ({
    value: key,
    label: $t(`tasks.type.${key}`)
  }))
}
</script>

<template>
  <TaskFilter field="type" v-bind="filter" />
</template>