<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { Skill } from '@/types'
import { notify } from '@/composables/use-toast'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ projectId: string }>()

const { t } = useI18n()
const repository = useProjectStore()
const route = useRoute()
const router = useRouter()

/** N-21: the skill name reads as a folder, `skill.md` sits under it and can be collapsed. */
const collapsed = shallowRef<string[]>([])
const collapsedNames = computed(() => new Set(collapsed.value))

const project = computed(() => repository.projects.find((item) => item.id === props.projectId))
const skills = computed(() => (project.value ? repository.skillsOf(project.value.id) : []))
const editingSkillId = computed(() => String(route.params.skillId ?? ''))

function back(): void {
  void router.push({ name: 'projects' })
}

function openSkill(skillId: string): void {
  void router.push({ name: 'skill-editor', params: { projectId: props.projectId, skillId } })
}

function toggle(name: string): void {
  collapsed.value = collapsedNames.value.has(name)
    ? collapsed.value.filter((item) => item !== name)
    : [...collapsed.value, name]
}

/** `skill.md` is the file half of `邻书/skill.md`. */
function fileName(skill: Skill): string {
  return skill.file.path.split('/')[1]
}

/** The project survives its last skill: removal is never blocked by what references it. */
function removeSkill(skill: Skill): void {
  const removed = repository.removeSkill(skill.id)
  if (!removed) return
  notify(t('panel.skillDeleted', { name: removed.name }))
  // The editor is addressed by skill id, so deleting the open file has to leave that route.
  if (removed.id === editingSkillId.value) {
    void router.push({ name: 'project-skills', params: { projectId: props.projectId } })
  }
}
</script>

<template>
  <!-- N-20: a second column that opens to the right of the sidebar. -->
  <aside class="edit-panel">
    <div class="ep-top">
      <button type="button" class="btn btn--icon" :aria-label="t('panel.back')" @click="back">
        <AppIcon name="arrowLeft" :size="17" />
      </button>
      <p class="ep-project">{{ project?.name ?? '' }}</p>
    </div>

    <p class="sb-label">{{ t('panel.skills') }}</p>

    <div class="ep-body">
      <p v-if="skills.length === 0" class="ep-empty">{{ t('panel.emptySkills') }}</p>
      <div v-for="skill in skills" :key="skill.id" class="skill-folder">
        <button
          type="button"
          class="sf-name"
          :class="{ 'sf-name--open': !collapsedNames.has(skill.name) }"
          @click="toggle(skill.name)"
        >
          <AppIcon name="folder" :size="15" />
          <span>{{ skill.name }}</span>
        </button>
        <div v-show="!collapsedNames.has(skill.name)" class="sf-file-row">
          <button
            type="button"
            class="skill-file"
            :class="{ 'skill-file--active': skill.id === editingSkillId }"
            @click="openSkill(skill.id)"
          >
            <AppIcon name="file" :size="14" />
            <span>{{ fileName(skill) }}</span>
          </button>
          <button
            type="button"
            class="sf-remove"
            :aria-label="t('panel.delete')"
            :title="t('panel.delete')"
            @click="removeSkill(skill)"
          >
            <AppIcon name="close" :size="13" />
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.edit-panel {
  flex-shrink: 0;
  width: 272px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--lf-border);
  background: var(--lf-sidebar);
}

.ep-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-bottom: 1px solid var(--lf-border);
}

.ep-project {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ep-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 10px 12px;
}

.ep-empty {
  margin: 4px 10px;
  font-size: 12px;
  color: var(--lf-faint);
}

.skill-folder {
  margin-bottom: 8px;
}

.sf-name {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.sf-name:hover {
  background: var(--lf-surface-2);
}

.sf-name--open {
  color: var(--lf-accent);
}

.sf-name span {
  overflow-wrap: anywhere;
}

.skill-file {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px 6px 38px;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-muted);
  font: inherit;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.skill-file:hover,
.skill-file--active {
  background: var(--lf-accent-soft);
  color: var(--lf-accent);
}

.skill-file span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-file-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Kept visible rather than hover-gated: a delete that cannot be found is not an option. */
.sf-remove {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--lf-r-sm);
  background: transparent;
  color: var(--lf-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sf-remove:hover {
  background: var(--lf-danger);
  color: #fff;
}
</style>
