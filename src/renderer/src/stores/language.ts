import { defineStore } from 'pinia'
import {
  FALLBACK_LANGUAGE,
  isUserPreferredLanguage,
  languageFromLocale,
  type UserPreferredLanguage
} from '@shared/language'
import { i18n } from '@/i18n'

/** An explicit 中/EN click is kept on disk, so a restart does not drop back to the OS locale. */
export const PREFERRED_LANGUAGE_KEY = 'lexforge:preferred-language'

export const useLanguageStore = defineStore('language', {
  state: () => ({
    current: FALLBACK_LANGUAGE
  }),

  actions: {
    apply(language: UserPreferredLanguage): void {
      this.current = language
      i18n.global.locale.value = language
      document.documentElement.lang = language
      // The window title is the taskbar name: 辞萃 in Chinese, LexForge in English.
      document.title = i18n.global.t('app.displayName')
      // The tray menu is main-process chrome, so it has to be told which language is showing.
      window.lexforge?.setLanguage(language)
    },

    /** A choice the user clicked wins; otherwise the OS locale decides. */
    async initialize(): Promise<void> {
      const storedChoice = window.localStorage.getItem(PREFERRED_LANGUAGE_KEY)
      if (isUserPreferredLanguage(storedChoice)) {
        this.apply(storedChoice)
        return
      }
      // Opened in a plain browser (the Vite dev URL) there is no preload bridge, so the browser's
      // own locale decides instead of falling through to the English fallback.
      this.apply(
        window.lexforge ? await window.lexforge.getDefaultLanguage() : languageFromLocale(navigator.language)
      )
    },

    select(language: UserPreferredLanguage): void {
      this.apply(language)
      window.localStorage.setItem(PREFERRED_LANGUAGE_KEY, language)
    },

    /**
     * `me.lang` is the account's own preference, so it outranks the operating system — but never a
     * choice the user clicked here, and it is not written to disk either.
     */
    adoptAccountLang(language: UserPreferredLanguage | null): void {
      if (!language) return
      if (window.localStorage.getItem(PREFERRED_LANGUAGE_KEY)) return
      this.apply(language)
    }
  }
})
