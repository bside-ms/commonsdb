<script setup lang="ts">
interface HeadlineProps {
    size?: "sm" | "md" | "lg",
    textAlign?: "left" | "center" | "right"
}
defineProps<HeadlineProps>()
</script>

<template>
    <div :class="[
        'bg-black p-3',
        { 'mb-12': !size || size === 'lg', 'mb-6': size === 'md', 'py-2': size === 'sm' }
    ]">
        <div :class="[
            'font-serif font-bold  text-white',
            { 'text-2xl': !size || size === 'lg', 'text-lg': size === 'md', 'text-base': size === 'sm' },
            { 'text-center': !textAlign || textAlign === 'center', 'text-left': textAlign === 'left', 'text-right': textAlign === 'right' }
        ]">
            <slot />
        </div>
    </div>
</template>