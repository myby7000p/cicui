import { fileURLToPath } from 'node:url'
import { defineConfig } from 'electron-vite'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const rendererSrc = fileURLToPath(new URL('./src/renderer/src', import.meta.url))
const shared = fileURLToPath(new URL('./src/shared', import.meta.url))
const sharedAlias = { '@shared': shared }

/**
 * The backend origin comes from `.env` alone. The CSP in `index.html` used to be edited by hand
 * alongside it, and a missed edit shows up as a silently blocked request rather than an error.
 */
function apiOrigin(): string {
  const base = loadEnv('', process.cwd(), 'VITE_').VITE_API_BASE
  if (!base) return ''
  try {
    return new URL(base).origin
  } catch {
    return ''
  }
}

const cspApiOrigin = {
  name: 'lexforge-csp-api-origin',
  transformIndexHtml: (html: string): string => html.replaceAll('__API_ORIGIN__', apiOrigin())
}

export default defineConfig({
  main: { resolve: { alias: sharedAlias } },
  preload: { resolve: { alias: sharedAlias } },
  renderer: {
    plugins: [vue(), cspApiOrigin],
    resolve: { alias: { '@': rendererSrc, ...sharedAlias } },
    // `true` binds every interface so a phone or another machine can open the renderer over the LAN
    // IP. Electron is unaffected: electron-vite folds wildcard hosts back into `localhost` when it
    // writes `ELECTRON_RENDERER_URL`, so the desktop window keeps loading from localhost.
    server: { host: true }
  }
})
