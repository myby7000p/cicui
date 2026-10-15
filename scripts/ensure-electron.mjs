import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronMarker = join(projectRoot, 'node_modules', 'electron', 'path.txt')

if (existsSync(electronMarker)) process.exit(0)

function readMirrorFromNpmrc() {
  const npmrcPath = join(projectRoot, '.npmrc')
  if (!existsSync(npmrcPath)) return undefined
  const line = readFileSync(npmrcPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith('electron_mirror='))
  return line?.slice('electron_mirror='.length).trim()
}

// npm 11 stopped forwarding unknown .npmrc keys into package scripts, so pass the mirror explicitly.
const mirror = process.env.ELECTRON_MIRROR ?? readMirrorFromNpmrc()

const result = spawnSync(process.execPath, ['node_modules/electron/install.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: mirror ? { ...process.env, ELECTRON_MIRROR: mirror } : process.env
})

process.exit(result.status ?? 1)
