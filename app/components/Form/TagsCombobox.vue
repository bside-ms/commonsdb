<script setup lang="ts">
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete } from '@/components/ui/tags-input'
import { ComboboxAnchor, ComboboxContent, ComboboxInput, ComboboxPortal, ComboboxRoot } from 'radix-vue'

export interface ComboboxItem { value: string, label: string }

interface TagsComboboxProps {
    name: string; formValues: any; setFieldValue: (name: any, value: any) => void;
    placeholder: string;
    disabled?: boolean;
    fetchSuggestions?: (nameLike?: string) => Promise<ComboboxItem[]>
}
const { name, formValues, disabled, setFieldValue, fetchSuggestions } = defineProps<TagsComboboxProps>()
const emit = defineEmits(['update:modelValue'])

const modelValue = computed({
    get: () => formValues[name] ?? [],
    set: val => val,
})
const open = ref(false)
const searchTerm = ref('')

const suggestions: Ref<ComboboxItem[]> = ref([])
const filteredSuggestions = computed(() => suggestions.value?.filter(i => !modelValue.value.some((v: ComboboxItem) => v.label === i.label)))
const onSelectSuggestion = (ev: any) => {
    if (typeof ev.detail.value === 'string') {
        searchTerm.value = ''
        const item = suggestions.value?.find(i => i.value === ev.detail.value);
        if (item) {
            setFieldValue(name, [
                ...modelValue.value,
                item
            ])
        }
    }

    if (filteredSuggestions.value?.length === 0) {
        open.value = false
    }
}

const onRemove = (id: string) => {
    setFieldValue(name, modelValue.value.filter((x: any) => x.value !== id))
}

watch(() => disabled, async (isDisabled, wasDisabled) => {
    if (fetchSuggestions && wasDisabled && !isDisabled) {
        await fetchSuggestions()
    }
})

onMounted(async () => {
    if (fetchSuggestions) {
        suggestions.value = await fetchSuggestions()
    }
})
</script>

<template>
    <TagsInput class="px-0 gap-0" :model-value="modelValue">
        <div class="flex gap-2 flex-wrap items-center px-3">
            <TagsInputItem v-for="item in modelValue" :key="item.value" :value="item.value">
                <span class="py-1 px-2">{{ item.label }}</span>
                <TagsInputItemDelete @click="onRemove(item.value)" />
            </TagsInputItem>
        </div>

        <ComboboxRoot v-model="modelValue" v-model:open="open" v-model:search-term="searchTerm" class="w-full"
            :disabled="disabled">
            <ComboboxAnchor as-child>
                <ComboboxInput :placeholder="placeholder" as-child>
                    <TagsInputInput class="w-full px-3" :class="modelValue.length > 0 ? 'mt-2' : ''"
                        @keydown.enter.prevent />
                </ComboboxInput>
            </ComboboxAnchor>

            <ComboboxPortal>
                <ComboboxContent>
                    <CommandList position="popper"
                        class="w-[--radix-popper-anchor-width] rounded-md mt-2 border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[999]">
                        <CommandEmpty>
                            Keine Ergebnisse
                        </CommandEmpty>
                        <CommandGroup>
                            <CommandItem v-for="suggestion in filteredSuggestions" :key="suggestion.value"
                                :value="suggestion.value" @select.prevent="onSelectSuggestion">
                                {{ suggestion.label }}
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </ComboboxContent>
            </ComboboxPortal>
        </ComboboxRoot>
    </TagsInput>
</template>