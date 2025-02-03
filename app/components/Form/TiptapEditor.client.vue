<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

interface TiptapEditorProps {
    name: string; formValues: any; setFieldValue: (name: any, value: any) => void;
}
const { name, formValues, setFieldValue } = defineProps<TiptapEditorProps>()

const editor: Ref<Editor | undefined> = ref();
const content = computed({
    get: () => formValues[name] ?? undefined,
    set: val => val,
})

onMounted(() => {
    editor.value = new Editor({
        content: content.value,
        onUpdate: () => {
            setFieldValue(name, editor.value?.getHTML())
        },
        extensions: [StarterKit],
    })
})

onUnmounted(() => {
    editor.value?.destroy()
})
</script>

<template>
    <editor-content :editor="editor" class="prose prose-sm max-w-none" />
</template>

<style lang="postcss">
.tiptap {
    @apply min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
}

.tiptap>p:first-child {
    @apply mt-0;
}

.tiptap>p:last-child {
    @apply mb-0;
}
</style>