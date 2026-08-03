<script setup lang="ts">
const { t: $t } = useI18n();

const filter = {
  label: "Status",
  items: [
    {
      value: 'OPEN',
      label: $t('tasks.assignmentStatus.OPEN')
    },
    {
      value: 'ASSIGNED',
      label: $t('tasks.assignmentStatus.ASSIGNED')
    }
  ]
}
</script>

<template>
  <TaskFilter field="assignmentStatus" v-bind="filter" />
</template>