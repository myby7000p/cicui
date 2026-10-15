<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, type RouteRecordName } from 'vue-router'
import type { MenuItem } from '@/types'
import type { NavKey } from '@/router'
import { useLocalized } from '@/composables/use-localized'
import { useMenu } from '@/composables/use-menu'
import { notify } from '@/composables/use-toast'
import { useAccountStore } from '@/stores/account'
import { useChatStore } from '@/stores/chat'
import { useProjectStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import RenameDialog from '@/components/dialogs/RenameDialog.vue'
import type { IconName } from '@/components/ui/icons'

const { t } = useI18n()
const account = useAccountStore()
const chat = useChatStore()
const repository = useProjectStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const pick = useLocalized()

// 设置 lives at the bottom beside the account, so it is not in this list. Chat is not here either:
// the 新建对话 button above is the only way into a conversation.
const items: { nav: NavKey; route: RouteRecordName; icon: IconName; label: string }[] = [
  { nav: 'library', route: 'library', icon: 'book', label: 'nav.library' },
  { nav: 'projects', route: 'projects', icon: 'apps', label: 'nav.projects' }
]

type RowTarget = { type: 'chat' | 'project'; id: string }

const { open: menuOpen, toggle: toggleMenu, close: closeMenu } = useMenu()
const menuTarget = shallowRef<RowTarget | null>(null)
const renameTarget = shallowRef<RowTarget & { name: string } | null>(null)
/** Message key rather than text, so switching language with the dialog open re-labels the error. */
const nameError = shallowRef('')

const projects = computed(() =>
  repository.projects.map((project) => ({ project, count: repository.skillsOf(project.id).length }))
)

/** The two row kinds share one menu: a chat thread has no skill column to open. */
const menuItems = computed<MenuItem[]>(() => {
  const target = menuTarget.value
  if (!target) return []
  const list: MenuItem[] = [{ key: 'rename', label: t('panel.rename') }]
  if (target.type === 'project') list.push({ key: 'skills', label: t('panel.editSkills') })
  list.push({ key: 'delete', label: t('panel.delete'), danger: true })
  return list
})

function open(item: (typeof items)[number]): void {
  void router.push({ name: item.route })
}

/** 设置 sits beside the account at the bottom instead of in the nav list. */
function goSettings(): void {
  void router.push({ name: 'settings' })
}

function isMenu(target: RowTarget): boolean {
  const current = menuTarget.value
  return menuOpen.value && !!current && current.type === target.type && current.id === target.id
}

function openMenu(target: RowTarget): void {
  menuTarget.value = target
  toggleMenu()
}

/** The name a row is labelled with, which is also what the rename dialog starts from. */
function rowName(target: RowTarget): string {
  if (target.type === 'project') return repository.projects.find((item) => item.id === target.id)?.name ?? ''
  const conversation = chat.conversations.find((item) => item.id === target.id)
  return conversation ? pick(conversation.title) : ''
}

function openRename(target: RowTarget): void {
  closeMenu()
  renameTarget.value = { ...target, name: rowName(target) }
  nameError.value = ''
}

function onMenuPick(key: string): void {
  const target = menuTarget.value
  if (!target) return
  if (key === 'rename') openRename(target)
  else if (key === 'skills') openProjectSkills(target.id)
  else if (key === 'delete') removeRow(target)
}

function removeRow(target: RowTarget): void {
  closeMenu()
  if (target.type === 'chat') {
    chat.removeConversation(target.id)
    notify(t('panel.chatDeleted'))
    return
  }
  void repository.deleteProject(target.id)
  // The editor and the skill column are both nested under the project, so leaving that route
  // behind would strand the view on an id that no longer resolves.
  if (String(route.params.projectId ?? '') === target.id) void router.push({ name: 'projects' })
  notify(t('panel.projectDeleted'))
}

function openProjectSkills(projectId: string): void {
  closeMenu()
  void router.push({ name: 'project-skills', params: { projectId } })
}

function submitRename(value: string): void {
  const target = renameTarget.value
  if (!target) return
  const name = value.trim()
  if (!name) {
    nameError.value = target.type === 'chat' ? 'dialog.renameChat.required' : 'dialog.rename.required'
    return
  }
  if (target.type === 'project') {
    if (repository.projects.some((item) => item.name === name && item.id !== target.id)) {
      nameError.value = 'dialog.newProject.duplicate'
      return
    }
    repository.renameProject(target.id, name)
  } else {
    chat.renameConversation(target.id, name)
  }
  renameTarget.value = null
}
</script>

<template>
  <div class="sb">
    <nav class="sb-nav">
      <button type="button" class="nav-item nav-item--primary" @click="chat.startNewChat()">
        <AppIcon name="plus" :size="15" />
        <span>{{ t('nav.newChat') }}</span>
      </button>
      <button
        v-for="item in items"
        :key="item.nav"
        type="button"
        class="nav-item"
        :class="{ 'nav-item--active': route.meta.nav === item.nav }"
        @click="open(item)"
      >
        <AppIcon :name="item.icon" :size="15" />
        <span>{{ t(item.label) }}</span>
      </button>
    </nav>

    <div class="sb-body">
      <p class="sb-label">{{ t('panel.recent') }}</p>
      <div v-for="conversation in chat.conversations" :key="conversation.id" class="sb-row" data-menu-root>
        <button
          type="button"
          class="chat-item"
          :class="{ 'chat-item--active': conversation.id === chat.activeConversationId }"
          :title="pick(conversation.title)"
          @click="chat.selectConversation(conversation.id)"
        >
          {{ pick(conversation.title) }}
        </button>
        <button
          type="button"
          class="row-dots"
          :aria-label="t('panel.rowActions')"
          :title="t('panel.rowActions')"
          @click="openMenu({ type: 'chat', id: conversation.id })"
        >
          <AppIcon name="dots" :size="15" />
        </button>
        <AppMenu :open="isMenu({ type: 'chat', id: conversation.id })" :items="menuItems" @pick="onMenuPick" />
      </div>
      <p v-if="chat.conversations.length === 0" class="sb-empty">{{ t('panel.noChats') }}</p>

      <!-- US-033: renaming a project has to be reachable from this panel, not only from its page. -->
      <template v-if="projects.length > 0">
        <p class="sb-label">{{ t('nav.projects') }}</p>
        <div v-for="entry in projects" :key="entry.project.id" class="sb-row" data-menu-root>
          <button
            type="button"
            class="chat-item"
            :class="{ 'chat-item--active': String(route.params.projectId ?? '') === entry.project.id }"
            :title="`${entry.project.name} · ${t('projects.skillCount', { count: entry.count })}`"
            @click="openProjectSkills(entry.project.id)"
          >
            {{ entry.project.name }}
          </button>
          <button
            type="button"
            class="row-dots"
            :aria-label="t('panel.rowActions')"
            :title="t('panel.rowActions')"
            @click="openMenu({ type: 'project', id: entry.project.id })"
          >
            <AppIcon name="dots" :size="15" />
          </button>
          <AppMenu :open="isMenu({ type: 'project', id: entry.project.id })" :items="menuItems" @pick="onMenuPick" />
        </div>
      </template>
    </div>

    <div class="sb-foot">
      <div class="sb-acct">
        <button v-if="!account.signedIn" type="button" class="acct-signin" @click="ui.openLogin()">
          {{ t('account.signInNow') }}
        </button>

        <div v-else class="acct" :title="account.username ?? undefined">
          <AppIcon name="user" :size="14" />
          <span class="acct-mail">{{ account.username }}</span>
        </div>

        <button
          type="button"
          class="acct-gear"
          :class="{ 'acct-gear--on': route.meta.nav === 'settings' }"
          :aria-label="t('nav.settings')"
          :title="t('nav.settings')"
          @click="goSettings"
        >
          <AppIcon name="gear" :size="16" />
        </button>
      </div>

      <div v-if="account.signedIn" class="sb-plan">
        <span>{{ account.plan === 'paid' ? t('account.paidPlan') : t('account.freePlan') }}</span>
        <!-- The backend has no usage endpoint, so both numbers stay 0; the slot keeps the row's shape. -->
        <span class="lim">0/0</span>
      </div>
    </div>

    <RenameDialog
      :open="!!renameTarget"
      :title="t(renameTarget?.type === 'chat' ? 'dialog.renameChat.title' : 'dialog.rename.title')"
      :label="t(renameTarget?.type === 'chat' ? 'dialog.renameChat.label' : 'dialog.rename.label')"
      :placeholder="t(renameTarget?.type === 'chat' ? 'dialog.renameChat.placeholder' : 'dialog.rename.placeholder')"
      :initial-value="renameTarget?.name ?? ''"
      :error="nameError"
      @submit="submitRename"
      @close="renameTarget = null"
    />
  </div>
</template>

<style scoped>
.sb {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sb-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-bottom: 1px solid var(--lf-border);
}

/* The action button is not a nav entry, so it keeps its own air above the list. */
.sb-nav .nav-item--primary {
  margin-bottom: 8px;
}

.sb-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 10px 10px;
}

.sb-row {
  position: relative;
}

.chat-item {
  /* Full panel width like the nav items above: the action button floats over the row's right end
     instead of eating 26px out of the label, which is what made the selected pill look short. */
  display: block;
  width: 100%;
  padding: 8px 34px 8px 10px;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-muted);
  font: inherit;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.chat-item:hover {
  background: var(--lf-surface-2);
  color: var(--lf-fg);
}

.chat-item--active {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
  font-weight: 600;
}

.row-dots {
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* The dots need the panel colour behind them so they never sit on top of a label glyph. */
.sb-row:hover .row-dots,
.sb-row:focus-within .row-dots {
  opacity: 1;
  background: var(--lf-sidebar);
}

.row-dots:hover {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
}

.sb-empty {
  margin: 4px 10px 0;
  font-size: 12px;
  color: var(--lf-faint);
}

.sb-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--lf-border);
  font-size: 12px;
  color: var(--lf-faint);
}

/* The account line and the 设置 button share the bottom row. */
.sb-acct {
  display: flex;
  align-items: center;
  gap: 6px;
}

.acct {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: var(--lf-r-sm);
  color: var(--lf-muted);
  font-size: 12px;
  text-align: left;
}

.acct-gear {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-muted);
  cursor: pointer;
}

.acct-gear:hover {
  background: var(--lf-surface-2);
  color: var(--lf-fg);
}

.acct-gear--on {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
}

.acct-signin {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: var(--lf-accent);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.acct-signin:hover {
  filter: brightness(1.08);
}

.acct-mail {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sb-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}

.lim {
  padding: 3px 8px;
  border-radius: var(--lf-r-pill);
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
  font-size: 11px;
  font-weight: 600;
}

/* No hover on a narrow window: the action button has to be visible, not discovered. */
@media (max-width: 820px) {
  .row-dots {
    opacity: 1;
  }
}
</style>
