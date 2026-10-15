<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ArtifactKind, ReadingEntry } from '@/types'
import { useLocalized } from '@/composables/use-localized'
import { ENTRY_SOURCE_LABEL } from '@/i18n/labels'
import { useChatStore } from '@/stores/chat'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ kind: ArtifactKind; entries: ReadingEntry[] }>()

const { t } = useI18n()
const pick = useLocalized()
const chat = useChatStore()
const repository = useProjectStore()
</script>

<template>
  <div>
    <h3 class="block-title">{{ t('card.similarTitle') }}</h3>

    <!-- N-13: rank, title, author + one-line summary, download on the right. -->
    <div class="rec-list">
      <article v-for="(entry, index) in props.entries" :key="entry.id" class="rec-item">
        <span class="rec-num">{{ index + 1 }}</span>
        <div class="rec-info">
          <p class="rec-name">{{ pick(entry.title) }}</p>
          <p class="rec-author">{{ t('card.entryMeta', { author: entry.author, year: entry.year, pages: entry.pages }) }}</p>
          <p class="rec-desc">{{ pick(entry.summary) }}</p>
          <span class="tag tag--soft source">{{ t(ENTRY_SOURCE_LABEL[entry.source]) }}</span>
        </div>
        <button
          type="button"
          class="dl-btn"
          :class="{ 'dl-btn--done': repository.isDownloaded(entry.id) }"
          :disabled="repository.isDownloaded(entry.id)"
          @click="chat.downloadEntry(entry)"
        >
          <AppIcon :name="repository.isDownloaded(entry.id) ? 'check' : 'download'" :size="13" />
          {{ repository.isDownloaded(entry.id) ? t('card.downloaded') : t('common.download') }}
        </button>
      </article>
    </div>
  </div>
</template>

<style scoped>
.block-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
}

.rec-name,
.rec-author,
.rec-desc {
  margin: 0;
}

.rec-author {
  margin-top: 2px;
}

.rec-desc {
  margin-top: 3px;
}

.source {
  margin-top: 7px;
}

@media (max-width: 560px) {
  .rec-item {
    flex-wrap: wrap;
  }
}
</style>
