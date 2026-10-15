import { defineStore } from 'pinia'
import { THEME_MODES } from '@shared/ipc'
import type { ThemeMode } from '@/types'

const THEME_KEY = 'lexforge:theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** A picked theme is a cosmetic choice, so it stays on disk and survives a restart. */
function readStoredTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_KEY)
  return (THEME_MODES as readonly string[]).includes(stored ?? '') ? (stored as ThemeMode) : 'system'
}

/** Chrome state only: which view is showing lives in the router. */
export const useUiStore = defineStore('ui', {
  state: () => ({
    // The prototype ships with the sidebar tucked away so the first screen is the brand + composer.
    sidebarOpen: false,
    themeMode: readStoredTheme(),
    /** Signing in is not enforced, so this is an overlay over whatever view is already open. */
    loginOpen: false,
    /** What the OS says right now; `startThemeSync` keeps it current. */
    systemDark: darkQuery.matches
  }),

  getters: {
    isDark: (state): boolean => state.themeMode === 'dark' || (state.themeMode === 'system' && state.systemDark)
  },

  actions: {
    /** Applies the current choice to the page, the disk and the main process. */
    applyTheme(): void {
      document.documentElement.classList.toggle('dark', this.isDark)
      window.localStorage.setItem(THEME_KEY, this.themeMode)
      // The Windows title bar follows nativeTheme, not the page, so the choice is mirrored to main.
      window.lexforge?.setTheme(this.themeMode)
    },

    /** Called once from bootstrap: the OS preference is a live source, so it has to stay tracked. */
    startThemeSync(): void {
      this.applyTheme()
      darkQuery.addEventListener('change', (event) => {
        this.systemDark = event.matches
        this.applyTheme()
      })
    },

    toggleSidebar(): void {
      this.sidebarOpen = !this.sidebarOpen
    },

    openSidebar(): void {
      this.sidebarOpen = true
    },

    closeSidebar(): void {
      this.sidebarOpen = false
    },

    setTheme(mode: ThemeMode): void {
      this.themeMode = mode
      this.applyTheme()
    },

    openLogin(): void {
      this.loginOpen = true
    },

    closeLogin(): void {
      this.loginOpen = false
    }
  }
})
