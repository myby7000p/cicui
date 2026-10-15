<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { notify } from '@/composables/use-toast'
import { saveBookSkill } from '@/api/books'
import { exportSkill, fetchSkillContent } from '@/api/skills'
import { downloadBase64 } from '@/utils/download'
import { useProjectStore } from '@/stores/projects'
import AppIcon from '@/components/ui/AppIcon.vue'
import MarkdownView from '@/components/ui/MarkdownView.vue'

const { t } = useI18n()
const repository = useProjectStore()
const route = useRoute()
const router = useRouter()

const draft = shallowRef('')
const mode = shallowRef<'edit' | 'preview'>('edit')
const busy = ref(false)
const exporting = ref<'pdf' | 'docx' | null>(null)

const skill = computed(() => {
  const skillId = String(route.params.skillId ?? '')
  return skillId ? repository.skillById(skillId) : undefined
})
/** §3.7 writes through the book, which is the address the active version lives under. */
const bookId = computed(() => (skill.value ? repository.projectOfSkill(skill.value.id)?.bookId ?? null : null))
const dirty = computed(() => !!skill.value && draft.value !== skill.value.file.content)

// The server holds the active text, so opening a skill reads it back instead of trusting the mirror.
watch(
  () => skill.value?.id,
  async () => {
    const current = skill.value
    draft.value = current?.file.content ?? ''
    mode.value = 'edit'
    if (!current?.skillId) return
    try {
      const markdown = (await fetchSkillContent(current.skillId)).markdown
      // The mirror's whole job is to match the server, so a read-back refreshes it too — otherwise a
      // freshly opened editor shows 「未保存」 before the user has typed anything.
      repository.saveSkillContent(current.id, markdown)
      draft.value = markdown
    } catch {
      // The interceptor already said what went wrong; the local copy stays editable.
    }
  },
  { immediate: true }
)

async function save(): Promise<void> {
  const current = skill.value
  if (!current || busy.value) return
  busy.value = true
  repository.saveSkillContent(current.id, draft.value)
  try {
    if (bookId.value) await saveBookSkill(bookId.value, draft.value)
    notify(t(bookId.value ? 'editor.savedToast' : 'editor.savedLocalToast'))
  } catch {
    // The mirror on disk is already updated, so say which half failed instead of claiming success.
    notify(t('editor.saveFailedToast'))
  } finally {
    busy.value = false
  }
}

/** The server renders the file, so only a skill it holds can be exported. Failures are already
 *  toasted by the interceptor — the button just stops spinning. */
async function exportAs(format: 'pdf' | 'docx'): Promise<void> {
  const current = skill.value
  if (!current?.skillId || exporting.value) return
  exporting.value = format
  try {
    const file = await exportSkill(current.skillId, format)
    downloadBase64({ base64: file.base64, contentType: file.content_type, fileName: file.file_name })
  } catch {
    // Nothing else to say: the envelope's own message reached the user.
  } finally {
    exporting.value = null
  }
}

/** Follow history when we navigated in; a deep-linked first entry has nothing behind it. */
function back(): void {
  if (router.options.history.state.back) void router.back()
  else void router.push({ name: 'projects' })
}
</script>

<template>
  <div v-if="skill" class="editor">
    <div class="view-wrap">
      <header class="editor-head">
        <div class="editor-heading">
          <button
            type="button"
            class="btn btn--icon"
            :aria-label="t('panel.back')"
            @click="back"
          >
            <AppIcon name="arrowLeft" :size="16" />
          </button>
          <h3>{{ skill.file.path }}</h3>
        </div>
        <div class="row">
          <span v-if="dirty" class="tag tag--warning">{{ t('editor.dirty') }}</span>
          <button type="button" class="btn btn--primary btn--sm" :disabled="!dirty || busy" @click="save">
            <AppIcon name="check" :size="14" />
            {{ busy ? t('editor.saving') : t('common.save') }}
          </button>
          <template v-if="skill.skillId">
            <span class="editor-sep" aria-hidden="true"></span>
            <button type="button" class="btn btn--sm" :disabled="!!exporting" @click="exportAs('pdf')">
              <AppIcon name="download" :size="14" />
              {{ exporting === 'pdf' ? t('editor.exporting') : t('editor.exportPdf') }}
            </button>
            <button type="button" class="btn btn--sm" :disabled="!!exporting" @click="exportAs('docx')">
              <AppIcon name="download" :size="14" />
              {{ exporting === 'docx' ? t('editor.exporting') : t('editor.exportWord') }}
            </button>
          </template>
        </div>
      </header>

      <div class="editor-tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="mode === 'edit'" @click="mode = 'edit'">
          {{ t('editor.edit') }}
        </button>
        <button type="button" role="tab" :aria-selected="mode === 'preview'" @click="mode = 'preview'">
          {{ t('editor.preview') }}
        </button>
      </div>

      <textarea v-if="mode === 'edit'" v-model="draft" class="md-editor" spellcheck="false"></textarea>
      <MarkdownView v-else :source="draft" strip-front-matter />
    </div>
  </div>
  <div v-else class="editor editor--empty">{{ t('editor.empty') }}</div>
</template>

<style scoped>
.editor {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.editor--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--lf-faint);
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.editor-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.editor-sep {
  width: 1px;
  height: 18px;
  background: var(--lf-border);
}

.editor-heading h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
</style>
