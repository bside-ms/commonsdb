<script setup lang="ts" generic="T extends AcceptableValue">
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import type { AcceptableValue } from 'reka-ui';

interface FormCommandProps {
    placeholder: string;
    disabled?: boolean;
    fetchSuggestions?: (nameLike?: string) => Promise<any[]>
}
const { fetchSuggestions } = defineProps<FormCommandProps>()
const modelValue = defineModel<T>()

const suggestions: Ref<{ label: string; value: T }[]> = ref([])
const loading = ref(false)
const doFetchSuggestions = async (search: string) => {
    if (fetchSuggestions && search.length) {
        loading.value = true
        suggestions.value = await fetchSuggestions(search)
    }
}
</script>

<template>
    <Combobox by="label" v-model:model-value="modelValue">
        <ComboboxAnchor as-child>
            <ComboboxInput class="w-full" :display-value="(val) => val?.label ?? ''" :placeholder="placeholder"
                @update:model-value="doFetchSuggestions" />
        </ComboboxAnchor>

        <ComboboxList>
            <ComboboxEmpty>
                Keine Ergebnisse
            </ComboboxEmpty>

            <ComboboxGroup>
                <ComboboxItem v-for="(suggestion, index) in suggestions" :key="index" :value="suggestion">
                    {{ suggestion.label }}
                </ComboboxItem>
            </ComboboxGroup>
        </ComboboxList>
    </Combobox>
    <!-- <ComboboxRoot v-model:open="open" v-model:search-term="searchTerm" @update:search-term="doFetchSuggestions"
        :disabled="disabled">
        <ComboboxAnchor as-child>
            <ComboboxInput :placeholder="placeholder"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
        </ComboboxAnchor>

        <ComboboxPortal>
            <ComboboxContent>
                <CommandList position="popper"
                    class="w-[--radix-popper-anchor-width] rounded-md mt-2 border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[999]">
                    <CommandEmpty>
                        Keine Ergebnisse
                    </CommandEmpty>
                    <CommandGroup>
                        <CommandItem v-for="({ value, label }, index) in suggestions" :key="index" :value="value"
                            @select.prevent="onSelectSuggestion">
                            {{ label }}
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </ComboboxContent>
        </ComboboxPortal>
    </ComboboxRoot> -->
</template>