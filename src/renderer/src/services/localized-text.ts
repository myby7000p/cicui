import type { LocalizedText } from '@/types'

/** Copy that is stored as data (a book title, a generated summary) carries both languages. */
export function verbatim(text: string): LocalizedText {
  return { 'zh-cn': text, 'en-us': text }
}

/** Guard for values read back from disk: a half-written object must not reach the views. */
export function isLocalizedText(value: unknown): value is LocalizedText {
  const text = value as Partial<LocalizedText> | undefined
  return typeof text?.['zh-cn'] === 'string' && typeof text?.['en-us'] === 'string'
}
