import { Menu, Tray, app, nativeImage } from 'electron'
import type { UserPreferredLanguage } from '@shared/language'

const LABELS: Record<UserPreferredLanguage, { show: string; quit: string; name: string }> = {
  'zh-cn': { show: '显示主窗口', quit: '退出 辞萃', name: '辞萃' },
  'en-us': { show: 'Show window', quit: 'Quit LexForge', name: 'LexForge' }
}

/** Tray artwork is downscaled once; the taskbar cannot show more than this anyway. */
const TRAY_ICON_SIZE = 32

let tray: Tray | null = null
let language: UserPreferredLanguage = 'en-us'
let showWindow = (): void => {}

function applyLanguage(): void {
  if (!tray) return
  const labels = LABELS[language]
  tray.setToolTip(labels.name)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: labels.show, click: () => showWindow() },
      { type: 'separator' },
      { label: labels.quit, click: () => app.quit() }
    ])
  )
}

export function createTray(iconPath: string, onShow: () => void): void {
  showWindow = onShow
  const image = nativeImage.createFromPath(iconPath).resize({ width: TRAY_ICON_SIZE, quality: 'best' })
  tray = new Tray(image)
  // Windows restores on double-click; macOS menu-bar items only get the single click.
  tray.on('double-click', onShow)
  if (process.platform === 'darwin') tray.on('click', onShow)
  applyLanguage()
}

export function setTrayLanguage(next: UserPreferredLanguage): void {
  if (next === language) return
  language = next
  applyLanguage()
}
