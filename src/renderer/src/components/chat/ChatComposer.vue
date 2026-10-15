<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ArtifactKind } from '@/types'
import { createTranscript } from '@/services/asr'
import type { Asr } from '@/services/types'
import { useDictation } from '@/composables/use-dictation'
import { useEventListener } from '@/composables/use-event-listener'
import { useLocalized } from '@/composables/use-localized'
import { useMenu } from '@/composables/use-menu'
import { useMention } from '@/composables/use-mention'
import { notify } from '@/composables/use-toast'
import { useChatStore } from '@/stores/chat'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'

const { t } = useI18n()
const pick = useLocalized()
const chat = useChatStore()
const repository = useProjectStore()
const { open, toggle, close } = useMenu()
const dictation = useDictation()

const draft = shallowRef('')
const plusQuery = shallowRef('')
const plusKind = shallowRef<ArtifactKind | null>(null)
const chooserKind = shallowRef<ArtifactKind>('book')
const fileInput = useTemplateRef<HTMLInputElement>('file-input')
const plusInput = useTemplateRef<HTMLInputElement>('plus-input')
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')

const {
  typing: mentionTyping,
  suggestions: mentionOptions,
  activeIndex: mentionIndex,
  mentioned,
  refresh: refreshMention,
  apply: applyMention,
  confirm: confirmMention,
  onKeyDown: onMentionKey,
  dismiss: dismissMention
} = useMention(draft, textarea, { disabled: () => chat.searchKind !== null })

/** The highlighted option needs an address the textarea can point at for screen readers. */
const activeMentionId = computed(() => {
  const picked = mentionOptions.value[mentionIndex.value]
  return mentionTyping.value && picked ? `mention-option-${picked.id}` : undefined
})

/** Text already settled before dictation started, plus what the recogniser is still rewriting. */
const transcript = createTranscript()

const accept = computed(() => (chooserKind.value === 'book' ? '.pdf,.epub,.mobi' : '.pdf,.doc,.docx'))

const placeholder = computed(() => {
  if (chat.searchKind === 'book') return t('composer.book')
  if (chat.searchKind === 'paper') return t('composer.paper')
  return t('composer.chat')
})

const canSend = computed(() => !!draft.value.trim())

interface SourceCard {
  kind: ArtifactKind
  mode: 'upload' | 'search'
  label: string
  badge: string
  badgeKind: 'fmt' | 'via'
}

const sources: SourceCard[] = [
  { kind: 'book', mode: 'upload', label: 'composer.uploadBook', badge: 'composer.formatsBook', badgeKind: 'fmt' },
  { kind: 'book', mode: 'search', label: 'composer.searchBook', badge: 'composer.searchBookHint', badgeKind: 'via' },
  { kind: 'paper', mode: 'upload', label: 'composer.uploadPaper', badge: 'composer.formatsPaper', badgeKind: 'fmt' },
  { kind: 'paper', mode: 'search', label: 'composer.searchPaper', badge: 'composer.searchPaperHint', badgeKind: 'via' }
]

/** The panel groups its four cards by section, so the template stays a loop and never filters. */
const sourceGroups = computed(() =>
  (['book', 'paper'] as const).map((row) => ({
    row,
    label: row === 'book' ? t('composer.rowBooks') : t('composer.rowPapers'),
    items: sources.filter((source) => source.kind === row)
  }))
)

const searchPlaceholder = computed(() => {
  if (plusKind.value === 'book') return t('composer.searchBookPh')
  if (plusKind.value === 'paper') return t('composer.searchPaperPh')
  return t('composer.plusSearchPh')
})

function onSegment(segment: Asr.Segment): void {
  draft.value = transcript.push(segment)
}

async function toggleDictation(): Promise<void> {
  if (dictation.active.value) {
    dictation.stop()
    return
  }
  const spoken = draft.value.trim()
  transcript.reset(spoken ? `${spoken} ` : '')
  const started = await dictation.start(onSegment)
  if (!started) {
    notify(t(dictation.error.value || 'composer.micDenied'))
    return
  }
  void nextTick(() => textarea.value?.focus())
}

function onShortcut(event: KeyboardEvent): void {
  if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
    event.preventDefault()
    void toggleDictation()
  }
}

useEventListener(window, 'keydown', onShortcut)

function send(): void {
  const text = draft.value
  if (!text.trim()) return
  chat.submit(text)
  draft.value = ''
  dismissMention()
}

function openPlus(): void {
  plusKind.value = null
  toggle()
}

async function choose(source: (typeof sources)[number]): Promise<void> {
  if (source.mode === 'upload') {
    chooserKind.value = source.kind
    close()
    // `accept` is bound to chooserKind, so the dialog has to wait for the re-render.
    await nextTick()
    fileInput.value?.click()
    return
  }
  // Search cards keep the panel open and drop the caret into its search box; just closing the
  // panel reads as "nothing happened".
  plusKind.value = source.kind
  chat.startSearch(source.kind)
  void nextTick(() => plusInput.value?.focus())
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) chat.pickFile(chooserKind.value, file)
  input.value = ''
}

function searchFromPlus(): void {
  const query = plusQuery.value.trim()
  if (!query) {
    plusInput.value?.focus()
    return
  }
  close()
  chat.searchFromPlusInput(query, plusKind.value ?? undefined)
  plusQuery.value = ''
}
</script>

<template>
  <div class="composer-wrap">
    <!-- US-014: keep the routing target visible, and never let an unknown name pass as a skill. -->
    <div v-if="mentioned.known.length || mentioned.unknown.length" class="mention-bar">
      <span v-for="skill in mentioned.known" :key="skill.id" class="tag tag--soft">
        <AppIcon name="folder" :size="12" />
        {{ skill.name }}
      </span>
      <span v-for="name in mentioned.unknown" :key="name" class="tag tag--warning">
        <AppIcon name="warning" :size="12" />
        @{{ name }}
      </span>
    </div>

    <div v-if="mentionTyping" id="mention-pop" class="mention-pop" role="listbox" :aria-label="t('composer.mentionList')">
      <button
        v-for="(skill, index) in mentionOptions"
        :id="`mention-option-${skill.id}`"
        :key="skill.id"
        type="button"
        class="mention-item"
        role="option"
        :aria-selected="index === mentionIndex"
        :class="{ 'mention-item--on': index === mentionIndex }"
        @mousedown.prevent="applyMention(skill)"
      >
        <AppIcon name="folder" :size="13" />
        <span class="mi-name">@{{ skill.name }}</span>
        <span class="mi-title">{{ pick(skill.title) }}</span>
      </button>
      <p v-if="mentionOptions.length === 0" class="mi-empty">
        {{ repository.skills.length === 0 ? t('composer.mentionEmpty') : t('composer.mentionNoMatch') }}
      </p>
    </div>

    <div class="composer">
      <div class="anchor" data-menu-root>
        <button type="button" class="plus-btn" :aria-label="t('composer.plus')" @click="openPlus()">
          <AppIcon name="plus" :size="18" />
        </button>
      </div>

      <textarea
        ref="textarea"
        v-model="draft"
        rows="1"
        role="combobox"
        :aria-label="t('composer.chat')"
        aria-autocomplete="list"
        :aria-expanded="mentionTyping"
        :aria-activedescendant="activeMentionId"
        :aria-controls="mentionTyping ? 'mention-pop' : undefined"
        :placeholder="placeholder"
        @input="refreshMention"
        @click="refreshMention"
        @keyup.left="refreshMention"
        @keyup.right="refreshMention"
        @keydown="onMentionKey"
        @keydown.enter.exact.prevent="confirmMention(send)"
      ></textarea>

      <div class="comp-tools">
        <button v-if="chat.searchKind" type="button" class="btn btn--sm" @click="chat.cancelSearch()">
          {{ t('composer.cancelSearch') }}
        </button>

        <button
          type="button"
          class="tool-btn"
          :class="{ 'tool-btn--rec': dictation.active.value }"
          :aria-label="dictation.active.value ? t('composer.stopVoice') : t('composer.mic')"
          :title="dictation.active.value ? t('composer.stopVoice') : t('composer.mic')"
          @click="toggleDictation"
        >
          <AppIcon :name="dictation.active.value ? 'stop' : 'mic'" :size="18" />
        </button>

        <button type="button" class="send-btn" :disabled="!canSend" :aria-label="t('composer.chat')" @click="send">
          <AppIcon name="send" :size="16" />
        </button>
      </div>
    </div>

    <p class="composer-hint">{{ t('composer.hint') }}</p>
    <input ref="file-input" type="file" class="file-input" :accept="accept" @change="onPick" />

    <!-- N-07: the plus list is a centered panel with the four sources and one search box. -->
    <Teleport to="body">
      <div v-if="open" class="plus-pop" data-menu-root>
        <p class="pp-title">{{ t('composer.plus') }}</p>
        <section v-for="group in sourceGroups" :key="group.row" class="pp-row">
          <span class="pp-rowlabel">{{ group.label }}</span>
          <div class="pp-group2">
            <button
              v-for="source in group.items"
              :key="source.label"
              type="button"
              class="src-card"
              :class="{ 'src-card--on': source.mode === 'search' && plusKind === source.kind }"
              @click="choose(source)"
            >
              <span class="t">
                <AppIcon
                  :name="source.mode === 'upload' ? (source.kind === 'book' ? 'book' : 'file') : 'search'"
                  :size="15"
                />
                {{ t(source.label) }}
              </span>
              <span :class="source.badgeKind === 'fmt' ? 'fmt' : 's'">{{ t(source.badge) }}</span>
            </button>
          </div>
        </section>
        <div class="search-row">
          <input
            ref="plus-input"
            v-model="plusQuery"
            class="field"
            :placeholder="searchPlaceholder"
            @keydown.enter="searchFromPlus"
          />
          <button type="button" class="btn btn--primary" @click="searchFromPlus">{{ t('common.search') }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.composer-wrap {
  position: relative;
  padding: 12px 20px 20px;
  background: linear-gradient(transparent, var(--lf-bg) 30%);
}

.mention-bar {
  max-width: 760px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.mention-bar .tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* The suggestion list opens above the box so the caret and the picked name stay in view. */
.mention-pop {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 4px);
  transform: translateX(-50%);
  z-index: 60;
  width: min(760px, calc(100% - 40px));
  max-height: 260px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--lf-border);
  border-radius: var(--lf-r-lg);
  background: var(--lf-surface);
  box-shadow: var(--lf-shadow-lg);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--lf-fg);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.mention-item:hover,
.mention-item--on {
  background: var(--lf-accent-soft);
}

.mention-item--on {
  outline: 1px solid var(--lf-accent);
  outline-offset: -1px;
}

.mention-item .mi-name {
  flex: 0 1 auto;
  min-width: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.mention-item .mi-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--lf-faint);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mi-empty,
.composer {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--lf-border);
  border-radius: var(--lf-r-lg);
  background: var(--lf-surface);
  box-shadow: var(--lf-shadow);
  transition: border-color 0.16s ease;
}

.composer:focus-within {
  border-color: var(--lf-accent);
}

.composer textarea {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 34px;
  max-height: 140px;
  padding: 8px 2px;
  border: 0;
  background: transparent;
  color: var(--lf-fg);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.composer textarea::placeholder {
  color: var(--lf-faint);
}

.comp-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.plus-btn,
.tool-btn,
.send-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: var(--lf-r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;
}

.plus-btn,
.tool-btn {
  background: transparent;
  color: var(--lf-muted);
}

.plus-btn:hover,
.tool-btn:hover {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
}

.tool-btn--rec {
  background: var(--lf-danger);
  color: #fff;
}

.tool-btn--rec:hover {
  background: var(--lf-danger);
  color: #fff;
  filter: brightness(1.08);
}

.send-btn {
  border: 1px solid var(--lf-accent);
  background: var(--lf-accent);
  color: #fff;
}

.send-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.send-btn:disabled {
  border-color: var(--lf-border);
  background: var(--lf-surface-2);
  color: var(--lf-faint);
  cursor: not-allowed;
}

.composer-hint {
  max-width: 760px;
  margin: 8px auto 0;
  font-size: 11px;
  text-align: center;
  color: var(--lf-faint);
}

.plus-pop {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 70;
  width: 340px;
  max-width: 92vw;
  max-height: 88vh;
  overflow-y: auto;
  padding: 14px;
  border: 1px solid var(--lf-border);
  border-radius: var(--lf-r-lg);
  background: var(--lf-surface);
  box-shadow: var(--lf-shadow-lg);
}

.pp-group2 {
  display: flex;
  gap: 8px;
}

.src-card {
  flex: 1 1 0;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--lf-border);
  border-radius: 11px;
  background: var(--lf-surface);
  color: var(--lf-fg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.src-card:hover {
  border-color: var(--lf-accent);
  background: var(--lf-accent-soft);
}

.src-card--on {
  border-color: var(--lf-accent);
  background: var(--lf-accent-soft);
}

.src-card .t {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.src-card .s {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--lf-faint);
}

.src-card .fmt {
  display: inline-block;
  margin-top: 5px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
  font-size: 10px;
}

.src-card:hover .fmt {
  background: var(--lf-surface);
}

.file-input {
  display: none;
}
</style>
