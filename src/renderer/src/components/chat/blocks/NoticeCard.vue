<script setup lang="ts">
import type { LocalizedText } from '@/types'
import { useLocalized } from '@/composables/use-localized'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{
  tone: 'info' | 'warning'
  title: LocalizedText
  detail: LocalizedText
}>()

const pick = useLocalized()
</script>

<template>
  <div class="alert" :class="{ 'alert--warning': props.tone === 'warning' }" role="status">
    <AppIcon class="alert__mark" :name="props.tone === 'warning' ? 'warning' : 'info'" :size="16" />
    <div>
      <p class="alert__title">{{ pick(props.title) }}</p>
      <p class="alert__body">{{ pick(props.detail) }}</p>
    </div>
  </div>
</template>
