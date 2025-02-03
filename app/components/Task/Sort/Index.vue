<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ArrowDownUp } from 'lucide-vue-next'

const { t: $t } = useI18n()

const items = [
    {
        label: $t("sorts.DUE_ASC"),
        value: "DUE_ASC"
    },
    {
        label: $t("sorts.DUE_DESC"),
        value: "DUE_DESC"
    },
    {
        label: $t("sorts.PRIORITY_ASC"),
        value: "PRIORITY_ASC"
    },
    {
        label: $t("sorts.PRIORITY_DESC"),
        value: "PRIORITY_DESC"
    }
]
const mapping = {
    "DUE_ASC": { field: "dueEndDate", dir: "asc" },
    "DUE_DESC": { field: "dueEndDate", dir: "desc" },
    "PRIORITY_ASC": { field: "priority", dir: "asc" },
    "PRIORITY_DESC": { field: "priority", dir: "desc" },
}
</script>

<template>
    <Select>
        <SelectTrigger class="flex gap-3 max-w-[280px]">
            <ArrowDownUp class="size-3.5" />
            <SelectValue class="flex-1 text-left" :placeholder="$t('sort')" />
        </SelectTrigger>
        <SelectContent>
            <SelectGroup>
                <SelectItem v-for="item in items" :value="item.value">
                    {{ item.label }}
                </SelectItem>
            </SelectGroup>
        </SelectContent>
    </Select>
</template>