<script setup lang="ts">
import { cn } from '~/lib/utils';
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '../ui/button';
import { ChevronsUpDownIcon } from 'lucide-vue-next';

export interface ComboboxItem { value: string, label: string }

interface ComboboxProps {
    name: string; formValues: any; setFieldValue: (name: any, value: any) => void;
    placeholder: string;
    create?: (name: string) => Promise<ComboboxItem>
    fetchSuggestions?: (nameLike?: string) => Promise<ComboboxItem[]>
}
const { name, formValues, setFieldValue, create, fetchSuggestions } = defineProps<ComboboxProps>()
const emit = defineEmits(['selected'])

const open = ref(false)
const searchTerm = ref('')

const suggestions: Ref<ComboboxItem[]> = ref([])
const filteredSuggestions = computed(() => suggestions.value)
const onSelectSuggestion = (ev: any) => {
    if (typeof ev.detail.value === 'string') {
        searchTerm.value = ''
        const itemBefore = formValues.category;
        const item = suggestions.value?.find(i => i.label === ev.detail.value);
        if (item) {
            setFieldValue(name, item)
            open.value = false

            if (itemBefore.value !== item.value) {
                emit("selected", item)
            }
        }
    }

    if (filteredSuggestions.value?.length === 0) {
        open.value = false
    }
}

const onCreateAndSelect = async () => {
    if (create) {
        const newCategoryComboboxItem = await create(searchTerm.value);
        searchTerm.value = ''
        setFieldValue(name, newCategoryComboboxItem)
        open.value = false
    }
}

onMounted(async () => {
    if (fetchSuggestions) {
        suggestions.value = await fetchSuggestions()
    }
})
</script>

<template>
    <Popover v-model:open="open">
        <PopoverTrigger as-child>
            <FormControl>
                <Button variant="outline" role="combobox"
                    :class="cn('justify-between font-normal', !formValues.category && 'text-muted-foreground')">
                    {{ formValues.category ? formValues.category.label : placeholder }}
                    <ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </FormControl>
        </PopoverTrigger>
        <PopoverContent class="w-full p-0">
            <Command v-model:search-term="searchTerm">
                <CommandInput placeholder />
                <CommandEmpty as-child>
                    <Button variant="ghost" size="xs" class="w-full text-sm font-normal text-left"
                        @click.prevent="onCreateAndSelect">
                        Kategorie "{{ searchTerm }}" erstellen
                    </Button>
                </CommandEmpty>
                <CommandList>
                    <CommandGroup>
                        <CommandItem v-for="suggestion in filteredSuggestions" :key="suggestion.value"
                            :value="suggestion.label" @select.prevent="onSelectSuggestion">
                            {{ suggestion.label }}
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
</template>