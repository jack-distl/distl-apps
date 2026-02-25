import { cpSync, mkdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const out = resolve(root, 'dist')

// Clean previous merged output
if (existsSync(out)) {
  rmSync(out, { recursive: true })
}
mkdirSync(out, { recursive: true })

// Copy hub build to root dist/
cpSync(resolve(root, 'packages/hub/dist'), out, { recursive: true })

// Copy okr-planner build into dist/okr/
cpSync(resolve(root, 'packages/okr-planner/dist'), resolve(out, 'okr'), { recursive: true })

console.log('Merged builds into dist/')
