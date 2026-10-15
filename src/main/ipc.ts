import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import {
  IPC_GET_DEFAULT_LANGUAGE,
  IPC_SET_LANGUAGE,
  IPC_SET_THEME,
  IPC_WINDOW_CLOSE,
  IPC_WINDOW_MINIMIZE,
  IPC_WINDOW_TOGGLE_MAXIMIZE,
  THEME_MODES,
  type NativeThemeMode
} from '@shared/ipc'
import { isUserPreferredLanguage } from '@shared/language'
import { detectDefaultLanguage } from './services/language'
import { setTrayLanguage } from './services/tray'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_GET_DEFAULT_LANGUAGE, () => detectDefaultLanguage())
  ipcMain.on(IPC_SET_LANGUAGE, (_event, next: unknown) => {
    if (isUserPreferredLanguage(next)) setTrayLanguage(next)
  })
  ipcMain.on(IPC_SET_THEME, (_event, next: unknown) => {
    if (typeof next === 'string' && (THEME_MODES as readonly string[]).includes(next)) {
      nativeTheme.themeSource = next as NativeThemeMode
    }
  })

  // The frameless window's caption buttons live in the page, so main only carries out the action.
  // `close` still runs through the window's own `close` handler, which hides to the tray.
  ipcMain.on(IPC_WINDOW_MINIMIZE, (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
  ipcMain.on(IPC_WINDOW_TOGGLE_MAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  })
  ipcMain.on(IPC_WINDOW_CLOSE, (event) => BrowserWindow.fromWebContents(event.sender)?.close())
}
