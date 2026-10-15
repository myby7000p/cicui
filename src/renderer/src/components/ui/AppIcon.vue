<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName, type IconShape } from './icons'

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 17 })

// The table keeps each glyph's literal shape, so widen it here: only some entries declare `fill`.
const icon = computed<IconShape>(() => ICONS[props.name])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    :fill="icon.fill ? 'currentColor' : 'none'"
    :stroke="icon.fill ? 'none' : 'currentColor'"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path v-for="path in icon.paths" :key="path" :d="path" />
  </svg>
</template>
