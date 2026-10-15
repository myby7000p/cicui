export const userPreferredLanguages = ['zh-cn', 'en-us'] as const

export type UserPreferredLanguage = (typeof userPreferredLanguages)[number]

export const FALLBACK_LANGUAGE: UserPreferredLanguage = 'en-us'

export function isUserPreferredLanguage(value: unknown): value is UserPreferredLanguage {
  return typeof value === 'string' && (userPreferredLanguages as readonly string[]).includes(value)
}

/** The app only ships Simplified Chinese, so any Chinese system locale resolves to `zh-cn`. */
export function languageFromLocale(locale: string): UserPreferredLanguage {
  return locale.toLowerCase().startsWith('zh') ? 'zh-cn' : FALLBACK_LANGUAGE
}

/** The `Lang` request header the backend renders `message` by: `zh-CN` / `en-US`. */
export function apiLangFromLanguage(language: UserPreferredLanguage): 'zh-CN' | 'en-US' {
  return language === 'zh-cn' ? 'zh-CN' : 'en-US'
}

/** §4 `ui_lang`: the study endpoint takes the short form, not the header form. */
export function studyLangFromLanguage(language: UserPreferredLanguage): 'zh' | 'en' {
  return language === 'zh-cn' ? 'zh' : 'en'
}

/** `me.lang` comes back in header form; anything unrecognised is not a choice we can honour. */
export function languageFromApiLang(value: unknown): UserPreferredLanguage | null {
  if (typeof value !== 'string') return null
  const normalized = value.toLowerCase()
  if (normalized === 'zh-cn') return 'zh-cn'
  if (normalized === 'en-us') return 'en-us'
  return null
}
