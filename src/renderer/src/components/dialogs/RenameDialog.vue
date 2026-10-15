<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '@/components/ui/AppModal.vue'

const props = defineProps<{
  open: boolean
  title: string
  sub?: string
  label: string
  placeholder: string
  initialValue: string
  /** A message key, not text, so the row re-labels itself when the language changes. */
  error: string
}>()

const emit = defineEmits<{ submit: [value: string]; close: [] }>()

const { t } = useI18n()
const fieldId = useId()
const value = ref(props.initialValue)

// Re-opening the dialog for another row has to show that row's name, not the last edit.
watch(
  () => [props.open, props.initialValue],
  () => {
    value.value = props.initialValue
  }
)
</script>

<template>
  <AppModal v-if="open" :title="title" :sub="sub" @close="emit('close')">
    <div class="m-field">
      <label class="label" :for="fieldId">{{ label }}</label>
      <input
        :id="fieldId"
        v-model="value"
        class="field"
        :class="{ 'field--invalid': error }"
        :placeholder="placeholder"
        maxlength="40"
        @keydown.enter="emit('submit', value)"
      />
      <p v-if="error" class="error">{{ t(error) }}</p>
    </div>
    <template #footer>
      <button type="button" class="btn" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn btn--primary" @click="emit('submit', value)">
        {{ t('common.confirm') }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.m-field .label {
  margin: 0;
}
</style>
