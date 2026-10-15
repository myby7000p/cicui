import type { UserPreferredLanguage } from '@shared/language'

export const IPC_GET_DEFAULT_LANGUAGE = 'lexforge:get-default-language'
export const IPC_SET_LANGUAGE = 'lexforge:set-language'
export const IPC_SET_THEME = 'lexforge:set-theme'
export const IPC_WINDOW_MINIMIZE = 'lexforge:window-minimize'
export const IPC_WINDOW_TOGGLE_MAXIMIZE = 'lexforge:window-toggle-maximize'
export const IPC_WINDOW_CLOSE = 'lexforge:window-close'
/** Main → renderer: the frameless window's maximized state, so the caption button can swap glyphs. */
export const IPC_WINDOW_MAXIMIZED = 'lexforge:window-maximized'

/**
 * Every theme the app offers, in the order the segmented control shows them. Main and the renderer
 * both read this list, so the union type cannot drift away from what is actually selectable.
 */
export const THEME_MODES = ['system', 'light', 'dark'] as const

export type NativeThemeMode = (typeof THEME_MODES)[number]

export interface LexforgeApi {
  /** Resolve the UI language from this machine's OS locale. */
  getDefaultLanguage(): Promise<UserPreferredLanguage>
  /** Mirror the chosen language into main-process chrome (the tray menu). Fire and forget. */
  setLanguage(language: UserPreferredLanguage): void
  /** Mirror the chosen theme into native chrome: the Windows title bar follows nativeTheme, not the page. */
  setTheme(mode: NativeThemeMode): void
  /** `'win32' | 'darwin' | 'linux'`: the page only draws caption buttons where the window is frameless. */
  platform: string
  minimizeWindow(): void
  toggleMaximizeWindow(): void
  /** Goes through `BrowserWindow.close()`, so the hide-to-tray rule still applies. */
  closeWindow(): void
  onWindowMaximized(listener: (maximized: boolean) => void): void
}
