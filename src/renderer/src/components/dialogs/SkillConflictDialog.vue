<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import AppModal from '@/components/ui/AppModal.vue'

const { t } = useI18n()
const chat = useChatStore()

const prompt = computed(() => chat.conflictPrompt)
</script>

<template>
  <!-- §5.1: a book that already has a skill is a choice, not an error. Closing counts as 直接使用,
       which is the only answer that destroys nothing. -->
  <AppModal
    v-if="prompt"
    :title="t('dialog.conflict.title')"
    :sub="t('dialog.conflict.sub', { name: prompt.skill.name })"
    @close="chat.resolveConflict(true)"
  >
    <p class="conflict-meta">{{ t('dialog.conflict.meta') }}</p>

    <template #footer>
      <button type="button" class="btn" @click="chat.resolveConflict(false)">{{ t('dialog.conflict.regenerate') }}</button>
      <button type="button" class="btn btn--primary" @click="chat.resolveConflict(true)">{{ t('dialog.conflict.use') }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.conflict-meta {
  margin: 0;
  font-size: 12.5px;
  color: var(--lf-muted);
  overflow-wrap: anywhere;
}
</style>
