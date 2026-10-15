<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import { useProjectStore } from '@/stores/projects'
import { fileBaseName, slugify } from '@/services/skill'
import AppModal from '@/components/ui/AppModal.vue'

const { t } = useI18n()
const chat = useChatStore()
const repository = useProjectStore()

const skillName = shallowRef('')
/** Message key rather than text, so switching language with the dialog open re-labels the error. */
const error = shallowRef('')

const upload = computed(() => chat.pendingUpload)

const fileLine = computed(() => {
  if (!upload.value) return ''
  return t('dialog.skillName.file', {
    name: upload.value.meta.name,
    size: upload.value.meta.sizeMb,
    pages: upload.value.meta.pages
  })
})

watch(upload, (current) => {
  if (!current) return
  skillName.value = slugify(fileBaseName(current.meta.name), 32)
  error.value = ''
})

function confirm(): void {
  const value = skillName.value.trim()
  if (!value) {
    error.value = 'dialog.skillName.required'
    return
  }
  if (repository.skills.some((skill) => skill.name === value)) {
    error.value = 'dialog.skillName.duplicate'
    return
  }
  chat.confirmSkillName(value)
  chat.cancelUpload()
}
</script>

<template>
  <AppModal
    v-if="upload"
    :title="t('dialog.skillName.title')"
    :sub="t('dialog.skillName.sub')"
    @close="chat.cancelUpload()"
  >
    <p class="file">{{ fileLine }}</p>
    <div class="m-field">
      <label class="label" for="skill-name">{{ t('dialog.skillName.label') }}</label>
      <input
        id="skill-name"
        v-model="skillName"
        class="field"
        :class="{ 'field--invalid': error }"
        :placeholder="t('dialog.skillName.placeholder')"
        maxlength="40"
        @keydown.enter="confirm"
      />
      <p v-if="error" class="error">{{ t(error) }}</p>
    </div>
    <template #footer>
      <button type="button" class="btn" @click="chat.cancelUpload()">{{ t('common.cancel') }}</button>
      <button type="button" class="btn btn--primary" @click="confirm">{{ t('common.start') }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.file {
  margin: 0;
  padding: 9px 12px;
  border: 1px dashed var(--lf-border-strong);
  border-radius: var(--lf-r-md);
  background: var(--lf-surface-2);
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.m-field .label {
  margin: 0;
}
</style>
