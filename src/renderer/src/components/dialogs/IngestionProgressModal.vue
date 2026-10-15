<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { IngestionStage } from '@/types'
import { useChatStore } from '@/stores/chat'
import { INGESTION_STAGE_LABEL } from '@/i18n/labels'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppModal from '@/components/ui/AppModal.vue'

const { t } = useI18n()
const chat = useChatStore()

const STAGES: IngestionStage[] = ['queued', 'extracting', 'compiling', 'generating', 'attaching']

const run = computed(() => chat.runningRun)

const currentIndex = computed(() => {
  const stage = run.value?.stage
  if (!stage || stage === 'completed') return STAGES.length
  return STAGES.indexOf(stage)
})

/** One pass over the stages: the row used to ask for its own state three times per render. */
const stageStates = computed(() =>
  STAGES.map((stage, index) => ({
    stage,
    state: index < currentIndex.value ? 'done' : index === currentIndex.value ? 'now' : 'todo'
  }))
)
</script>

<template>
  <!-- The modal is the only close path once the pipeline starts: it ends when ingestion does. -->
  <AppModal v-if="run" :title="t('progress.title')" :dismissible="false">
    <p class="prog-name">
      <AppIcon name="spark" :size="16" />
      {{ run.skillName }}
      <span v-if="run.artifactKind === 'paper'">{{ t('progress.paperSuffix') }}</span>
    </p>
    <div class="prog-bar"><i :style="{ width: `${run.progress}%` }"></i></div>
    <div>
      <div v-for="item in stageStates" :key="item.stage" class="prog-item">
        <span class="prog-dot" :class="{ 'prog-dot--now': item.state === 'now', 'prog-dot--done': item.state === 'done' }">
          <AppIcon v-if="item.state === 'done'" name="check" :size="10" />
        </span>
        <span>{{ t(INGESTION_STAGE_LABEL[item.stage]) }}</span>
      </div>
    </div>
    <p class="prog-file">{{ run.fileName }}</p>
  </AppModal>
</template>

<style scoped>
.prog-name {
  margin: 0;
}

.prog-file {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: var(--lf-faint);
  overflow-wrap: anywhere;
}
</style>
