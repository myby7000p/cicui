<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { ArtifactKind } from '@/types'
import { useLocalized } from '@/composables/use-localized'
import { notify } from '@/composables/use-toast'
import { coverMark } from '@/services/cover-mark'
import { ARTIFACT_KIND_LABEL } from '@/i18n/labels'
import { timeAgo } from '@/services/time-ago'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'

const { t } = useI18n()
const pick = useLocalized()
const repository = useProjectStore()
const router = useRouter()

type KindFilter = ArtifactKind | 'all'

const kind = shallowRef<KindFilter>('all')
const query = shallowRef('')

const kinds: KindFilter[] = ['all', 'book', 'paper']

const all = computed(() => [...repository.skills].sort((a, b) => b.updatedAt - a.updatedAt))

const items = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return all.value
    .filter((skill) => kind.value === 'all' || skill.artifactKind === kind.value)
    .filter(
      (skill) =>
        !needle ||
        skill.name.toLowerCase().includes(needle) ||
        skill.title['zh-cn'].toLowerCase().includes(needle) ||
        skill.title['en-us'].toLowerCase().includes(needle)
    )
    .map((skill) => ({
      skill,
      cover: coverMark(pick(skill.title)),
      updated: timeAgo(skill.updatedAt)
    }))
})

/** A filter that matches nothing must not read as "the library is empty". */
const filtered = computed(() => kind.value !== 'all' || query.value.trim().length > 0)

function openEditor(skillId: string): void {
  const project = repository.projectOfSkill(skillId)
  if (!project) return
  void router.push({ name: 'skill-editor', params: { projectId: project.id, skillId } })
}

function removeSkill(skillId: string): void {
  const skill = repository.removeSkill(skillId)
  if (skill) notify(t('panel.skillDeleted', { name: skill.name }))
  // The editor is addressed through its skill, so removing the one on screen has to leave it.
  if (String(router.currentRoute.value.params.skillId ?? '') === skillId) {
    void router.push({ name: 'projects' })
  }
}
</script>

<template>
  <div class="library">
    <div class="view-wrap">
      <header class="view-head lib-head">
        <h2>{{ t('library.title') }}</h2>
        <div class="lib-tools">
          <div class="seg" role="group" :aria-label="t('library.filter')">
            <button
              v-for="option in kinds"
              :key="option"
              type="button"
              :aria-pressed="kind === option"
              @click="kind = option"
            >
              {{ option === 'all' ? t('library.filterAll') : t(ARTIFACT_KIND_LABEL[option]) }}
            </button>
          </div>
          <input
            v-model="query"
            class="field lib-search"
            type="search"
            maxlength="60"
            :placeholder="t('library.searchPh')"
            :aria-label="t('library.searchPh')"
          />
        </div>
      </header>

      <p v-if="items.length === 0" class="view-empty">
        {{ t(filtered ? 'library.emptyFiltered' : 'library.empty') }}
      </p>

      <article v-for="item in items" :key="item.skill.id" class="rec-item">
        <span class="rc-cover lib-cover">{{ item.cover }}</span>
        <div class="rec-info">
          <p class="rec-name">{{ pick(item.skill.title) }}</p>
          <p class="rec-author">
            {{
              t('library.meta', {
                kind: t(ARTIFACT_KIND_LABEL[item.skill.artifactKind]),
                pages: item.skill.pages,
                time: t(item.updated.key, item.updated.params)
              })
            }}
          </p>
          <p class="rec-desc">{{ item.skill.file.path }}</p>
        </div>
        <div class="lib-actions">
          <button type="button" class="btn btn--sm" @click="openEditor(item.skill.id)">
            <AppIcon name="pencil" :size="14" />
            {{ t('editor.edit') }}
          </button>
          <button
            type="button"
            class="btn btn--sm lib-remove"
            :aria-label="t('panel.delete')"
            :title="t('panel.delete')"
            @click="removeSkill(item.skill.id)"
          >
            <AppIcon name="close" :size="14" />
            {{ t('panel.delete') }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.library {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.lib-head {
  flex-wrap: wrap;
  gap: 10px;
}

.lib-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lib-search {
  width: 220px;
}

.lib-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

/* A destructive control must never look like the primary action next to it. */
.lib-remove {
  color: var(--lf-danger);
  border-color: var(--lf-danger);
}

.lib-remove:hover {
  background: var(--lf-danger);
  color: #fff;
}

.rec-item {
  margin-bottom: 12px;
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
  font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
  font-size: 11.5px;
  overflow-wrap: anywhere;
}

.lib-cover {
  width: 54px;
  height: 74px;
  font-size: 10px;
}

@media (max-width: 560px) {
  .lib-tools,
  .lib-actions {
    width: 100%;
  }

  .lib-search {
    flex: 1 1 auto;
    width: auto;
  }
}
</style>
