<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/shell/AppHeader.vue'
import SidePanel from '@/components/shell/SidePanel.vue'
import SkillsPanel from '@/components/shell/SkillsPanel.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppToast from '@/components/ui/AppToast.vue'
import IngestionProgressModal from '@/components/dialogs/IngestionProgressModal.vue'
import LibraryEmailDialog from '@/components/dialogs/LibraryEmailDialog.vue'
import LoginDialog from '@/components/dialogs/LoginDialog.vue'
import SearchResultsModal from '@/components/dialogs/SearchResultsModal.vue'
import SkillNameDialog from '@/components/dialogs/SkillNameDialog.vue'
import SkillConflictDialog from '@/components/dialogs/SkillConflictDialog.vue'
import logoUrl from '@/assets/logo.svg'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()
const route = useRoute()

/** Any route carrying `:projectId` opens the skill column next to the main view. */
const editingProjectId = computed(() => String(route.params.projectId ?? ''))

// Only the Windows build is frameless, so only there does the page own the caption buttons.
const frameless = window.lexforge?.platform === 'win32'
const maximized = ref(false)
window.lexforge?.onWindowMaximized((next) => {
  maximized.value = next
})

// Templates cannot reach `window` (Vue's global allowlist), so the caption buttons call these.
function minimizeWindow(): void {
  window.lexforge?.minimizeWindow()
}

function toggleMaximizeWindow(): void {
  window.lexforge?.toggleMaximizeWindow()
}

/** Goes through `BrowserWindow.close()`, so the existing hide-to-tray rule still applies. */
function closeWindow(): void {
  window.lexforge?.closeWindow()
}

// Below this width the panel floats over the page instead of sitting beside it, so it must not
// open itself and hide the view the user just navigated to.
const docks = window.matchMedia('(min-width: 820px)')

// US-004: the panel appears when a view needs its lists and tucks away for the chat.
watch(
  () => route.meta.nav,
  (nav) => {
    if (nav === 'chat') ui.closeSidebar()
    else if (docks.matches) ui.openSidebar()
  },
  // `immediate` so a start straight on #/library or a deep link gets the same rule as a click.
  { immediate: true }
)
</script>

<template>
  <div class="app" :class="{ 'app--framed': !frameless }">
    <!-- Window strip, frameless builds only: the sidebar toggle on the left and the caption buttons
         on the right. A browser tab has its own chrome, so there the toggle moves into the header. -->
    <div v-if="frameless" class="titlebar">
      <button
        type="button"
        class="btn btn--icon titlebar__btn"
        :aria-label="t(ui.sidebarOpen ? 'header.collapseSidebar' : 'header.expandSidebar')"
        @click="ui.toggleSidebar()"
      >
        <AppIcon name="panelLeft" :size="18" />
      </button>

      <!-- These are DOM, not native chrome, so a modal mask dims them with the rest of the window. -->
      <div class="titlebar__wins">
        <button type="button" class="titlebar__win" :aria-label="t('window.minimize')" :title="t('window.minimize')" @click="minimizeWindow">
          <AppIcon name="minus" :size="15" />
        </button>
        <button
          type="button"
          class="titlebar__win"
          :aria-label="t(maximized ? 'window.restore' : 'window.maximize')"
          :title="t(maximized ? 'window.restore' : 'window.maximize')"
          @click="toggleMaximizeWindow"
        >
          <AppIcon :name="maximized ? 'restore' : 'maximize'" :size="14" />
        </button>
        <button type="button" class="titlebar__win titlebar__win--close" :aria-label="t('window.close')" :title="t('window.close')" @click="closeWindow">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </div>

    <div class="body">
      <!-- `inert` keeps a collapsed sidebar out of the tab order: width 0 alone still leaves it focusable. -->
      <aside class="sidebar" :class="{ 'sidebar--collapsed': !ui.sidebarOpen }" :inert="!ui.sidebarOpen">
        <div class="sb-head">
          <img class="logo" :src="logoUrl" alt="LexForge" />
          <span class="brand">
            {{ t('app.name') }}
            <small>{{ t('app.brand') }}</small>
          </span>
        </div>

        <SidePanel />
      </aside>

      <SkillsPanel v-if="editingProjectId" :project-id="editingProjectId" />

      <main class="main">
        <AppHeader :sidebar-toggle="!frameless" />

        <div class="screen">
          <RouterView />
        </div>
      </main>
    </div>
  </div>

  <SkillNameDialog />
  <SkillConflictDialog />
  <LibraryEmailDialog />
  <SearchResultsModal />
  <IngestionProgressModal />
  <LoginDialog v-if="ui.loginOpen" />
  <AppToast />
</template>

<style scoped>
.app {
  /* The strip's height doubles as the Windows caption-button height (App.vue `.titlebar__wins`). */
  --titlebar-h: 40px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* No strip in a browser tab, so the floating panel below starts at the very top of the page. */
.app--framed {
  --titlebar-h: 0px;
}

.titlebar {
  flex: 0 0 auto;
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 0 10px;
  border-bottom: 1px solid var(--lf-border);
  background: var(--lf-sidebar);
  -webkit-app-region: drag;
}

.titlebar button {
  -webkit-app-region: no-drag;
}

/* Electron composites a drag region above normal content, so a `z-index` mask cannot cover the
 * strip while it is draggable. Every dialog renders a `.modal-mask`, so the drag region steps
 * aside for as long as one is in the tree — nobody drags a window that has a modal open. */
html:has(.modal-mask) .titlebar {
  -webkit-app-region: no-drag;
}

.sb-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-bottom: 1px solid var(--lf-border);
}

.logo {
  flex: 0 0 auto;
  height: 30px;
  width: auto;
  display: block;
}

/* The navy letterform in the logo disappears on the dark surface, so it sits on a light chip there. */
html.dark .logo {
  padding: 3px 5px;
  border-radius: 8px;
  background: #eef0f8;
}

.brand {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.brand small {
  display: block;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: var(--lf-faint);
}

.titlebar__btn {
  margin-left: 2px;
}

/* Windows caption buttons, drawn here because the window is frameless: 46px wide like the native
   ones, full strip height, and the close button takes the usual red hover. */
.titlebar__wins {
  margin-left: auto;
  display: flex;
  align-self: stretch;
}

.titlebar__win {
  width: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--lf-muted);
  cursor: pointer;
}

.titlebar__win:hover {
  background: var(--lf-surface-2);
  color: var(--lf-fg);
}

.titlebar__win--close:hover {
  background: var(--lf-danger);
  color: #fff;
}

.body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.sidebar {
  flex-shrink: 0;
  width: 272px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--lf-border);
  background: var(--lf-sidebar);
  transition: width 0.22s ease, margin-left 0.22s ease;
}

.sidebar--collapsed {
  width: 0;
  margin-left: -1px;
  border-right: none;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.screen {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 820px) {
  /* The floating panel starts under the window strip, so the brand stays reachable. */
  .sidebar:not(.sidebar--collapsed) {
    position: fixed;
    inset: var(--titlebar-h) auto 0 0;
    z-index: 40;
    box-shadow: var(--lf-shadow-lg);
  }
}
</style>
