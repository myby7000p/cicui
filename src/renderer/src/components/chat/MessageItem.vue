<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChatBlock, ChatMessage, ResultTab, StudyPlanAssumptions } from '@/types'
import { useLocalized } from '@/composables/use-localized'
import { coverMark } from '@/services/cover-mark'
import { RESULT_TAB_LABEL } from '@/i18n/labels'
import { useLanguageStore } from '@/stores/language'
import EntryListCard from '@/components/chat/blocks/EntryListCard.vue'
import NoticeCard from '@/components/chat/blocks/NoticeCard.vue'
import OutlineCard from '@/components/chat/blocks/OutlineCard.vue'
import StudyPlanCard from '@/components/chat/blocks/StudyPlanCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MarkdownView from '@/components/ui/MarkdownView.vue'

const props = defineProps<{ message: ChatMessage }>()
/** Emits don't bubble: the plan card's edit is re-emitted so the chat view can write it through the store. */
const emit = defineEmits<{ updatePlan: [assumptions: StudyPlanAssumptions] }>()

const { t } = useI18n()
const pick = useLocalized()
const language = useLanguageStore()

const tab = shallowRef<ResultTab>('overview')

const ARTIFACT_BLOCKS = ['outline', 'study-plan', 'entry-list']
const isArtifact = (block: ChatBlock): boolean => ARTIFACT_BLOCKS.includes(block.kind)

const plainBlocks = computed(() => props.message.blocks.filter((block) => !isArtifact(block)))

const outlineBlock = computed(() => {
  const block = props.message.blocks.find((item) => item.kind === 'outline')
  return block?.kind === 'outline' ? block : null
})
const planBlock = computed(() => {
  const block = props.message.blocks.find((item) => item.kind === 'study-plan')
  return block?.kind === 'study-plan' ? block : null
})
const listBlock = computed(() => {
  const block = props.message.blocks.find((item) => item.kind === 'entry-list')
  return block?.kind === 'entry-list' ? block : null
})

const coverTitle = computed(() => coverMark(outlineBlock.value ? pick(outlineBlock.value.sourceTitle) : ''))

/** US-020 / US-022: a tab exists only once its block is in the message, so no tab is ever empty. */
const availableTabs = computed<ResultTab[]>(() => {
  const list: ResultTab[] = []
  if (outlineBlock.value) list.push('overview')
  if (planBlock.value) list.push('plan')
  if (listBlock.value) list.push('similar')
  return list
})

/**
 * Derived instead of watched: a tab that lost its block falls back to the first available one, and
 * the user's own pick survives a block that comes and goes.
 */
const activeTab = computed<ResultTab>(() =>
  availableTabs.value.includes(tab.value) ? tab.value : availableTabs.value[0] ?? 'overview'
)

const createdAt = computed(() =>
  new Intl.DateTimeFormat(language.current === 'zh-cn' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(props.message.createdAt))
)
</script>

<template>
  <article class="msg" :class="props.message.role === 'user' ? 'msg--user' : 'msg--assistant'">
    <span class="avatar">
      <AppIcon v-if="props.message.role === 'assistant'" name="spark" :size="14" />
      <template v-else>U</template>
    </span>

    <div class="msg__body">
      <!-- Chat blocks carry no id and are only ever appended, so the position is the stable key. -->
      <template v-for="(block, index) in plainBlocks" :key="index">
        <p v-if="block.kind === 'text'" class="bubble">{{ pick(block.text) }}</p>
        <!-- §4 answers arrive as markdown, so they render instead of showing the raw source. -->
        <div v-else-if="block.kind === 'markdown'" class="bubble bubble--md"><MarkdownView :source="pick(block.text)" /></div>
        <NoticeCard v-else-if="block.kind === 'notice'" :tone="block.tone" :title="block.title" :detail="block.detail" />
      </template>

      <section v-if="availableTabs.length > 0" class="result-card">
        <header v-if="outlineBlock" class="rc-head">
          <span class="rc-cover">{{ coverTitle }}</span>
          <div class="rc-heading">
            <p class="rc-title">{{ pick(outlineBlock.sourceTitle) }}</p>
            <p class="rc-sub">{{ pick(outlineBlock.subtitle) }}</p>
          </div>
        </header>

        <div v-if="availableTabs.length > 1" class="rc-tabs" role="tablist">
          <button
            v-for="item in availableTabs"
            :key="item"
            type="button"
            role="tab"
            :aria-selected="activeTab === item"
            @click="tab = item"
          >
            {{ t(RESULT_TAB_LABEL[item]) }}
          </button>
        </div>

        <div class="rc-body">
          <OutlineCard v-if="activeTab === 'overview' && outlineBlock" :outline="outlineBlock.outline" />
          <StudyPlanCard
            v-else-if="activeTab === 'plan' && planBlock"
            :assumptions="planBlock.assumptions"
            @update="emit('updatePlan', $event)"
          />
          <EntryListCard
            v-else-if="activeTab === 'similar' && listBlock"
            :kind="listBlock.artifactKind"
            :entries="listBlock.entries"
          />
        </div>
      </section>

      <p class="msg__time">{{ createdAt }}</p>
    </div>
  </article>
</template>

<style scoped>
.msg {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.msg--user {
  flex-direction: row-reverse;
}

.avatar {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--lf-surface-2);
  color: var(--lf-accent);
}

.msg--user .avatar {
  background: var(--lf-accent);
  color: #fff;
}

.msg__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* The body keeps the full row width: a shrink-to-fit parent makes the bubble's `max-width: 82%`
   resolve against its own content, which wraps short messages into a single vertical column. */
.msg--user .msg__body {
  align-items: flex-end;
}

.msg__time {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--lf-faint);
}

.bubble {
  margin: 0;
  max-width: 82%;
  padding: 12px 14px;
  border: 1px solid var(--lf-border);
  border-radius: 12px;
  background: var(--lf-surface);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}

/* Rendered markdown carries its own block spacing; the bubble's `pre-wrap` would double every break. */
.bubble--md {
  max-width: 100%;
  white-space: normal;
}

.msg--user .bubble {
  border-color: var(--lf-accent);
  background: var(--lf-accent);
  color: #fff;
}

.rc-heading {
  min-width: 0;
}

.rc-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--lf-faint);
  overflow-wrap: anywhere;
}
</style>
