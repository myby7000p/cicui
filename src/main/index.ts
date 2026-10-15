import { app, BrowserWindow, nativeTheme, screen, session, shell } from 'electron'
import { join } from 'path'
import { IPC_WINDOW_MAXIMIZED } from '@shared/ipc'
import { registerIpcHandlers } from './ipc'
import { createTray } from './services/tray'
import windowIcon from '../../resources/icon.png?asset'

const rendererUrl = process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null
/** Closing the window parks the app in the tray, so quitting needs an explicit flag. */
let quitting = false

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    title: 'LexForge',
    // Without this, the Windows title bar keeps Electron's own icon in dev.
    icon: windowIcon,
    show: false,
    autoHideMenuBar: true,
    // Windows: frameless, because a native or overlay-drawn caption strip is painted above the web
    // content and no CSS mask can dim it. The page draws its own brand strip and its own caption
    // buttons (App.vue `.titlebar`), so a modal covers the whole window like every other Electron
    // AI client. macOS and Linux keep their native frames.
    ...(process.platform === 'win32'
      ? {
          frame: false,
          backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1217' : '#f6f7f9'
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window

  // A frameless window maximized on Windows swallows the invisible resize border and overflows the
  // work area by ~8px per side, so pin it to the work area. The renderer needs the state to swap
  // the caption button between maximize and restore glyphs.
  window.on('maximize', () => {
    const { workArea } = screen.getDisplayMatching(window.getBounds())
    window.setBounds(workArea)
    window.webContents.send(IPC_WINDOW_MAXIMIZED, true)
  })
  window.on('unmaximize', () => window.webContents.send(IPC_WINDOW_MAXIMIZED, false))

  window.on('ready-to-show', () => window.show())

  window.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
  })
  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showMainWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// A second launch surfaces the running instance instead of opening another window. Only for
// packaged builds: dev runs share one userData dir, so the lock would silently kill a new
// `npm run dev` whenever another instance is still open.
const holdsSingleInstance = app.isPackaged ? app.requestSingleInstanceLock() : true
if (!holdsSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)

  app.whenReady().then(() => {
    // The window icon does not reach the macOS dock.
    if (process.platform === 'darwin') app.dock?.setIcon(windowIcon)
    registerIpcHandlers()
    // The dictation button is the only capability that needs a device; grant the mic, deny the rest.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === 'media')
    })
    createTray(windowIcon, showMainWindow)
    createWindow()

    app.on('activate', showMainWindow)
  })

  app.on('before-quit', () => {
    quitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
