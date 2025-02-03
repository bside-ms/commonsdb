<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate, parseDateTime, today } from '@internationalized/date'
import { toDate } from 'radix-vue/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
    FormControl,
} from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps { name: string; formValues: any; setFieldValue: any; placeholder?: string }
const { name, formValues, setFieldValue } = defineProps<DatePickerProps>()

const df = new DateFormatter('de-DE', {
    dateStyle: 'medium',
})

const value = computed({
    get: () => deepGetByPath(formValues, name) ? parseDate(deepGetByPath(formValues, name)) : undefined,
    set: val => val,
})
</script>

<template>
    <Popover>
        <PopoverTrigger as-child>
            <FormControl>
                <Button variant="outline" :class="cn(
                    'ps-3 justify-start text-left font-normal',
                    !value && 'text-muted-foreground'
                )">
                    <CalendarIcon class="mr-2 h-4 w-4 opacity-50" />
                    <span>{{ value ? df.format(toDate(value)) : placeholder }}</span>
                </Button>
                <input hidden>
            </FormControl>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0">
            <Calendar v-model="value" initial-focus :min-value="today(getLocalTimeZone())" @update:model-value="(v) => {
                if (v) {
                    setFieldValue(name, v.toString())
                }
                else {
                    setFieldValue(name, undefined)
                }
            }" />
        </PopoverContent>
    </Popover>
</template>