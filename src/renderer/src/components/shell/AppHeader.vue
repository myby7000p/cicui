<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { THEME_MODES } from '@shared/ipc'
import { userPreferredLanguages } from '@shared/language'
import { THEME_LABEL } from '@/i18n/labels'
import { useChatStore } from '@/stores/chat'
import { useLanguageStore } from '@/stores/language'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/ui/AppIcon.vue'

const { t } = useI18n()
const chat = useChatStore()
const language = useLanguageStore()
const ui = useUiStore()

const themes = THEME_MODES

/** True when this build has no window strip of its own, so the sidebar toggle lives here. */
defineProps<{ sidebarToggle: boolean }>()
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <button
        v-if="sidebarToggle"
        type="button"
        class="btn btn--icon"
        :aria-label="t(ui.sidebarOpen ? 'header.collapseSidebar' : 'header.expandSidebar')"
        @click="ui.toggleSidebar()"
      >
        <AppIcon name="panelLeft" :size="18" />
      </button>
      <span class="top-tagline">{{ t('tagline.topbar') }}</span>
    </div>

    <div class="topbar__right">
      <!-- US-005: the corner shortcut only exists while the sidebar is away. -->
      <button v-if="!ui.sidebarOpen" type="button" class="btn btn--primary btn--sm" @click="chat.startNewChat()">
        <AppIcon name="plus" :size="14" />
        <span class="lbl">{{ t('nav.newChat') }}</span>
      </button>

      <div class="seg" role="group" :aria-label="t('language.label')">
        <button
          v-for="option in userPreferredLanguages"
          :key="option"
          type="button"
          :aria-pressed="language.current === option"
          @click="language.select(option)"
        >
          {{ option === 'en-us' ? 'EN' : '中' }}
        </button>
      </div>

      <div class="seg" role="group" :aria-label="t('theme.label')">
        <button
          v-for="mode in themes"
          :key="mode"
          type="button"
          :aria-pressed="ui.themeMode === mode"
          :title="t(THEME_LABEL[mode])"
          @click="ui.setTheme(mode)"
        >
          <AppIcon :name="mode === 'system' ? 'monitor' : mode === 'light' ? 'sun' : 'moon'" :size="14" />
          <span class="lbl">{{ t(THEME_LABEL[mode]) }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--lf-border);
  /* Same token as `.sidebar` / `.titlebar` (App.vue): one colour for the whole chrome column. */
  background: var(--lf-sidebar);
}

.topbar__left,
.topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.topbar__right {
  flex: 0 0 auto;
}

.top-tagline {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--lf-faint);
}

@media (max-width: 900px) {
  .top-tagline {
    display: none;
  }
}

@media (max-width: 820px) {
  .topbar__right .btn .lbl {
    display: none;
  }
}
</style>
