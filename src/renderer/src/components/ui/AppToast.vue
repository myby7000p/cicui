<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import { useToasts } from '@/composables/use-toast'

const toasts = useToasts()
</script>

<template>
  <div v-if="toasts.length" class="toast-layer">
    <p v-for="toast in toasts" :key="toast.id" class="toast">
      <AppIcon name="check" :size="15" class="toast__mark" />
      {{ toast.text }}
    </p>
  </div>
</template>
