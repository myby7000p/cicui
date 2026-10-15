import type { LocalizedText } from '@/types'
import { useLanguageStore } from '@/stores/language'

/** Data carries both languages so switching locale re-translates messages already on screen. */
export function useLocalized(): (text: LocalizedText) => string {
  const language = useLanguageStore()
  return (text) => text[language.current]
}
