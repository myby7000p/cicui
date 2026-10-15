<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReadingEntry } from '@/types'
import { useLocalized } from '@/composables/use-localized'
import { useAccountStore } from '@/stores/account'
import { useChatStore } from '@/stores/chat'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppModal from '@/components/ui/AppModal.vue'

const { t } = useI18n()
const pick = useLocalized()
const account = useAccountStore()
const chat = useChatStore()
const repository = useProjectStore()

const selected = shallowRef<ReadingEntry | null>(null)
const results = computed(() => chat.searchResults)

/** The mailbox this search runs against; how many books are left on it is the library's own count. */
const sub = computed(() => {
  if (results.value?.kind === 'book' && account.libraryEmail) {
    return t('search.subMailbox', { email: account.libraryEmail })
  }
  return t('search.sub')
})

watch(results, (current) => {
  // A row already in a project cannot be downloaded again, so start on the first available one.
  selected.value = current?.entries.find((entry) => !repository.isDownloaded(entry.id)) ?? null
})

function confirm(): void {
  const entry = selected.value
  if (!entry) return
  chat.downloadEntry(entry)
}

const retryMode = computed(() => chat.searchStatus === 'failed')

const canConfirm = computed(() =>
  retryMode.value
    ? chat.searchQuery.trim().length > 0
    : !!selected.value && !repository.isDownloaded(selected.value.id)
)

function onPrimary(): void {
  if (retryMode.value) chat.retrySearch()
  else confirm()
}
</script>

<template>
  <AppModal v-if="results" :title="t('search.title')" :sub="sub" @close="chat.closeSearchResults()">
    <div v-if="chat.searchStatus === 'loading'" class="sr-state">
      <span class="prog-dot prog-dot--now"></span>
      <span>{{ t('search.loading', { query: chat.searchQuery }) }}</span>
    </div>

    <div v-else-if="chat.searchStatus === 'failed'" class="sr-state">
      <AppIcon name="warning" :size="15" />
      <span>{{ t(chat.searchNotConfigured ? 'search.notConfigured' : 'search.failed') }}</span>
    </div>

    <p v-else-if="results.entries.length === 0" class="view-empty">{{ t('search.empty') }}</p>

    <div v-else class="sr-list">
      <label
        v-for="entry in results.entries"
        :key="entry.id"
        class="sr-item"
        :class="{ 'sr-item--sel': selected?.id === entry.id }"
      >
        <input
          v-model="selected"
          type="radio"
          name="search-result"
          :value="entry"
          :disabled="repository.isDownloaded(entry.id)"
        />
        <span class="sr-info">
          <span class="sr-title">{{ pick(entry.title) }}</span>
          <span class="sr-meta">{{ t('card.entryMeta', { author: entry.author, year: entry.year, pages: entry.pages }) }}</span>
        </span>
        <span class="sr-format">{{ entry.format }}</span>
      </label>
    </div>

    <template #footer>
      <button type="button" class="btn" @click="chat.closeSearchResults()">{{ t('common.close') }}</button>
      <button
        v-if="chat.searchStatus !== 'loading'"
        type="button"
        class="btn btn--primary"
        :disabled="!canConfirm"
        @click="onPrimary"
      >
        {{ retryMode ? t('search.retry') : t('common.download') }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.sr-item {
  cursor: pointer;
}

.sr-title,
.sr-meta {
  display: block;
}

/* Retrieval is a round trip, so the wait and its failure need the same weight as the list. */
.sr-state {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 22px 4px;
  font-size: 13px;
  color: var(--lf-muted);
}

.sr-state svg {
  color: var(--lf-warning);
}

.view-empty {
  padding: 20px 0;
}
</style>
