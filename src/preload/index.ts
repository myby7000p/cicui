import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_GET_DEFAULT_LANGUAGE,
  IPC_SET_LANGUAGE,
  IPC_SET_THEME,
  IPC_WINDOW_CLOSE,
  IPC_WINDOW_MAXIMIZED,
  IPC_WINDOW_MINIMIZE,
  IPC_WINDOW_TOGGLE_MAXIMIZE,
  type LexforgeApi
} from '@shared/ipc'

const api: LexforgeApi = {
  getDefaultLanguage: () => ipcRenderer.invoke(IPC_GET_DEFAULT_LANGUAGE),
  setLanguage: (language) => ipcRenderer.send(IPC_SET_LANGUAGE, language),
  setTheme: (mode) => ipcRenderer.send(IPC_SET_THEME, mode),
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.send(IPC_WINDOW_MINIMIZE),
  toggleMaximizeWindow: () => ipcRenderer.send(IPC_WINDOW_TOGGLE_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_WINDOW_CLOSE),
  onWindowMaximized: (listener) => {
    ipcRenderer.on(IPC_WINDOW_MAXIMIZED, (_event, maximized) => listener(Boolean(maximized)))
  }
}

contextBridge.exposeInMainWorld('lexforge', api)
