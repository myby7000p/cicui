import { app } from 'electron'
import { languageFromLocale, type UserPreferredLanguage } from '@shared/language'

export function detectDefaultLanguage(): UserPreferredLanguage {
  const locale = app.getSystemLocale()
  const language = languageFromLocale(locale)
  console.log(`[language] system locale ${locale} -> ${language}`)
  return language
}
