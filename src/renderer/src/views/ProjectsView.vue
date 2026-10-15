<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { MenuItem, Project } from '@/types'
import { useMenu } from '@/composables/use-menu'
import { notify } from '@/composables/use-toast'
import { timeAgo } from '@/services/time-ago'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import RenameDialog from '@/components/dialogs/RenameDialog.vue'

const { t } = useI18n()
const repository = useProjectStore()
const router = useRouter()
const route = useRoute()

const renameTarget = shallowRef<Project | null>(null)
const createOpen = shallowRef(false)
/** Message key rather than text, so switching language with the dialog open re-labels the error. */
const nameError = shallowRef('')

const { open: menuOpen, toggle: toggleMenu, close: closeMenu } = useMenu()
const menuProject = shallowRef<Project | null>(null)

const projectMenu = computed<MenuItem[]>(() => [
  { key: 'rename', label: t('panel.rename') },
  { key: 'skills', label: t('panel.editSkills') },
  { key: 'delete', label: t('panel.delete'), danger: true }
])

const projects = computed(() =>
  repository.projects.map((project) => ({
    project,
    skills: repository.skillsOf(project.id),
    updated: timeAgo(project.updatedAt)
  }))
)

function openMenu(project: Project): void {
  menuProject.value = project
  toggleMenu()
}

function onMenuPick(key: string): void {
  const project = menuProject.value
  if (!project) return
  if (key === 'rename') openRename(project)
  else if (key === 'skills') openSkills(project.id)
  else if (key === 'delete') removeProject(project)
}

function openRename(project: Project): void {
  closeMenu()
  renameTarget.value = project
  nameError.value = ''
}

function openCreate(): void {
  createOpen.value = true
  nameError.value = ''
}

function taken(name: string): boolean {
  const currentId = renameTarget.value?.id
  return repository.projects.some((item) => item.name === name && item.id !== currentId)
}

function submitRename(value: string): void {
  const project = renameTarget.value
  if (!project) return
  const name = value.trim()
  if (!name) {
    nameError.value = 'dialog.rename.required'
    return
  }
  if (taken(name)) {
    nameError.value = 'dialog.newProject.duplicate'
    return
  }
  repository.renameProject(project.id, name)
  renameTarget.value = null
}

function openSkills(projectId: string): void {
  closeMenu()
  void router.push({ name: 'project-skills', params: { projectId } })
}

/** A project delete takes its skills with it, and the skill column cannot stay on a dead id. */
function removeProject(project: Project): void {
  closeMenu()
  void repository.deleteProject(project.id)
  if (String(route.params.projectId ?? '') === project.id) void router.push({ name: 'projects' })
  notify(t('projects.deletedToast', { name: project.name }))
}

function submitCreate(value: string): void {
  const name = value.trim()
  if (!name) {
    nameError.value = 'dialog.newProject.required'
    return
  }
  if (taken(name)) {
    nameError.value = 'dialog.newProject.duplicate'
    return
  }
  const project = repository.createProject(name)
  createOpen.value = false
  openSkills(project.id)
}
</script>

<template>
  <div class="projects">
    <div class="view-wrap">
      <header class="view-head">
        <h2>{{ t('projects.title') }}</h2>
        <button type="button" class="btn btn--primary btn--sm" @click="openCreate">
          <AppIcon name="plus" :size="14" />
          <span class="lbl">{{ t('projects.newOne') }}</span>
        </button>
      </header>

      <p v-if="projects.length === 0" class="view-empty">{{ t('panel.emptyProjects') }}</p>

      <article v-for="entry in projects" :key="entry.project.id" class="proj-item" data-menu-root>
        <span class="proj-ic"><AppIcon name="book" :size="18" /></span>
        <div class="proj-info">
          <p class="proj-name">{{ entry.project.name }}</p>
          <p class="proj-meta">
            {{ t('projects.skillCount', { count: entry.skills.length }) }} ·
            {{ t('projects.updated', { time: t(entry.updated.key, entry.updated.params) }) }}
          </p>
        </div>

        <!-- N-18 / N-19: gear is always there, the three dots join on hover. -->
        <button
          type="button"
          class="btn btn--icon"
          :aria-label="t('panel.editSkills')"
          :title="t('panel.editSkills')"
          @click="openSkills(entry.project.id)"
        >
          <AppIcon name="gear" :size="16" />
        </button>
        <button
          type="button"
          class="btn btn--icon proj-dots"
          :aria-label="t('panel.rowActions')"
          :title="t('panel.rowActions')"
          @click="openMenu(entry.project)"
        >
          <AppIcon name="dots" :size="16" />
        </button>

        <AppMenu
          :open="menuOpen && menuProject?.id === entry.project.id"
          :items="projectMenu"
          :style="{ '--dd-top': '52px', '--dd-right': '14px' }"
          @pick="onMenuPick"
        />
      </article>
    </div>

    <RenameDialog
      :open="!!renameTarget"
      :title="t('dialog.rename.title')"
      :label="t('dialog.rename.label')"
      :placeholder="t('dialog.rename.placeholder')"
      :initial-value="renameTarget?.name ?? ''"
      :error="nameError"
      @submit="submitRename"
      @close="renameTarget = null"
    />

    <RenameDialog
      :open="createOpen"
      :title="t('dialog.newProject.title')"
      :sub="t('dialog.newProject.sub')"
      :label="t('dialog.newProject.label')"
      :placeholder="t('dialog.newProject.placeholder')"
      initial-value=""
      :error="nameError"
      @submit="submitCreate"
      @close="createOpen = false"
    />
  </div>
</template>

<style scoped>
.projects {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.proj-info {
  flex: 1 1 auto;
  min-width: 0;
}

.proj-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.proj-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--lf-faint);
  overflow-wrap: anywhere;
}

.proj-dots {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.proj-item:hover .proj-dots,
.proj-item:focus-within .proj-dots {
  opacity: 1;
}

/* No hover on a narrow window: the menu trigger has to be visible, not discovered. */
@media (max-width: 820px) {
  .proj-dots {
    opacity: 1;
  }
}
</style>
