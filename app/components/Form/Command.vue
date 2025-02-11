<script setup lang="ts">
import {
    ComboboxAnchor,
    ComboboxContent,
    ComboboxInput,
    ComboboxPortal,
    ComboboxRoot,
} from 'radix-vue'
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'

interface FormCommandProps {
    placeholder: string;
    disabled?: boolean;
    fetchSuggestions?: (nameLike?: string) => Promise<any[]>
}
const { disabled, fetchSuggestions } = defineProps<FormCommandProps>()
const modelValue = defineModel()

const open = ref(false)
const searchTerm = ref('')

const suggestions: Ref<any[]> = ref([])
const onSelectSuggestion = (ev: any) => {
    const result = ev.detail.value;

    modelValue.value = result;
    searchTerm.value = suggestions.value.find(x => x.value.id === result.id)?.label ?? ""

    open.value = false;
}

const loading = ref(false)
const doFetchSuggestions = async (search: string) => {
    if (fetchSuggestions && search.length) {
        loading.value = true
        suggestions.value = await fetchSuggestions(search)
    }
}

defineExpose({
    reset: () => {
        open.value = false;
        searchTerm.value = ""
    }
})
</script>

<template>
    <ComboboxRoot v-model:open="open" v-model:search-term="searchTerm" @update:search-term="doFetchSuggestions"
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
    </ComboboxRoot>
</template>