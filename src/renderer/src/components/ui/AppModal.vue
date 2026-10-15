<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEscapeKey } from '@/composables/use-escape-key'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = withDefaults(defineProps<{ title: string; sub?: string; width?: string; dismissible?: boolean }>(), {
  dismissible: true
})
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

// A blocking dialog (ingestion in progress) answers to neither Escape nor the mask.
useEscapeKey(() => emit('close'), () => props.dismissible)

function onMaskClick(): void {
  if (props.dismissible) emit('close')
}
</script>

<template>
  <div class="modal-mask" @mousedown.self="onMaskClick">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="title" :style="width ? { width } : undefined">
      <!-- One corner close button for every dialog; a blocking one has nothing to close. -->
      <button v-if="dismissible" type="button" class="modal__x" :aria-label="t('common.close')" :title="t('common.close')" @click="emit('close')">
        <AppIcon name="close" :size="16" />
      </button>
      <h2 class="modal__title">{{ title }}</h2>
      <p v-if="sub" class="modal__sub">{{ sub }}</p>
      <div class="modal__body"><slot /></div>
      <footer v-if="$slots.footer" class="modal__foot m-btns"><slot name="footer" /></footer>
    </div>
  </div>
</template>

<style scoped>
.modal__x {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-faint);
  cursor: pointer;
}

.modal__x:hover {
  background: var(--lf-surface-2);
  color: var(--lf-fg);
}

.modal__title {
  margin: 0 0 6px;
  padding-right: 30px;
  font-size: 16px;
  font-weight: 700;
}

.modal__body {
  gap: 14px;
}
</style>
