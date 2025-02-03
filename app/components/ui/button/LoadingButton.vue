<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type ButtonVariants, buttonVariants } from '.'
import { cn } from '@/lib/utils'
import Loading3DotsBounce from './Loading3DotsBounce.vue'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size }), props.class)">
    <div class="flex items-center gap-2">
      <Loading3DotsBounce v-if="$attrs.disabled" class="size-4" />
      <slot />
    </div>
  </Primitive>
</template>
