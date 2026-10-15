import { computed, nextTick, ref, type Ref } from 'vue'
import type { Skill } from '@/types'
import { applyMentionToken, caretMention, splitMentions } from '@/services/skill'
import { useLocalized } from '@/composables/use-localized'
import { useProjectStore } from '@/stores/projects'

const OPTION_LIMIT = 6

interface UseMentionOptions {
  /** The composer disables addressing while it is in search mode. */
  disabled?: () => boolean
}

/**
 * US-014: `@` addresses a skill, so the popup offers what the library actually holds and the caret
 * decides which token is being typed. Every text change is written through the caller's draft ref,
 * which keeps the textarea's `v-model` as the only holder of the draft.
 */
export function useMention(
  draft: Ref<string>,
  area: Ref<HTMLTextAreaElement | null>,
  options: UseMentionOptions = {}
) {
  const repository = useProjectStore()
  const pick = useLocalized()
  const query = ref<string | null>(null)
  const activeIndex = ref(0)

  const typing = computed(() => query.value !== null)

  const suggestions = computed<Skill[]>(() => {
    if (query.value === null) return []
    const needle = query.value.toLowerCase()
    return repository.skills
      .filter(
        (skill) =>
          !needle || skill.name.toLowerCase().includes(needle) || pick(skill.title).toLowerCase().includes(needle)
      )
      .slice(0, OPTION_LIMIT)
  })

  /** Tokens typed so far, split into hits and misses so an unknown name is not silently ignored. */
  const mentioned = computed(() => splitMentions(draft.value, repository.skills))

  const active = computed(() => (typing.value ? suggestions.value[activeIndex.value] : undefined))

  /** Re-reads the caret: called on input, on click and when the caret moves. */
  function refresh(): void {
    const element = area.value
    if (!element || options.disabled?.()) {
      query.value = null
      return
    }
    query.value = caretMention(element.value.slice(0, element.selectionStart ?? element.value.length))
    activeIndex.value = 0
  }

  function apply(skill: Skill): void {
    const element = area.value
    if (!skill || !element) return
    const caret = element.selectionStart ?? element.value.length
    const before = applyMentionToken(element.value.slice(0, caret), skill.name)
    draft.value = `${before}${element.value.slice(caret)}`
    query.value = null
    void nextTick(() => {
      element.focus()
      element.setSelectionRange(before.length, before.length)
    })
  }

  /** Enter picks the highlighted skill while the caret sits on an `@` token, otherwise it sends. */
  function confirm(send: () => void): void {
    if (active.value) apply(active.value)
    else send()
  }

  /** True when the popup consumed the key, so the caller skips its own handling. */
  function onKeyDown(event: KeyboardEvent): boolean {
    if (!typing.value) return false
    if (event.key === 'Escape') {
      query.value = null
      return true
    }
    const size = suggestions.value.length
    if (size === 0) return false
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : size - 1)) % size
      return true
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      apply(suggestions.value[activeIndex.value])
      return true
    }
    return false
  }

  function dismiss(): void {
    query.value = null
  }

  return { typing, suggestions, activeIndex, mentioned, refresh, apply, confirm, onKeyDown, dismiss }
}
