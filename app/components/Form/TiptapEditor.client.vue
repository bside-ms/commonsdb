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
