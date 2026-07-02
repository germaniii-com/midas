import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..', '..')
const backendPkgPath = resolve(rootDir, 'backend', 'package.json')
const backendPkg = JSON.parse(readFileSync(backendPkgPath, 'utf-8'))

const deps = { ...backendPkg.dependencies }
const targetDir = resolve(__dirname, '..', 'release-backend-deps')

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true })
}

// Write a package.json to mark this as CommonJS (desktop/package.json has "type": "module")
writeFileSync(
  resolve(targetDir, 'backend-package.json'),
  JSON.stringify({ name: 'midas-backend', version: '1.0.0', private: true, type: 'commonjs' }, null, 2),
)

function resolveModule(name) {
  const rootPath = resolve(rootDir, 'node_modules', name)
  if (existsSync(rootPath)) return rootPath
  const backendPath = resolve(rootDir, 'backend', 'node_modules', name)
  if (existsSync(backendPath)) return backendPath
  return null
}

const seen = new Set()
let count = 0

function copyDep(name) {
  if (seen.has(name)) return
  seen.add(name)

  const resolved = resolveModule(name)
  if (!resolved) return

  const target = resolve(targetDir, 'node_modules', name)
  const targetParent = dirname(target)
  if (!existsSync(targetParent)) {
    mkdirSync(targetParent, { recursive: true })
  }

  execSync(`cp -RL "${resolved}" "${target}" 2>/dev/null || cp -R "${resolved}" "${target}"`, {
    stdio: 'ignore',
  })
  count++

  const pkgPath = resolve(resolved, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const subDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.optionalDependencies || {}),
      ...(pkg.peerDependencies || {}),
    }
    for (const subDep of Object.keys(subDeps)) {
      copyDep(subDep)
    }
  }
}

for (const dep of Object.keys(deps)) {
  copyDep(dep)
}

const totalSize = execSync(`du -sh "${targetDir}"`, { encoding: 'utf-8' }).split('\t')[0]
console.log(`Copied ${count} backend dependencies (${totalSize}) to ${targetDir}/node_modules`)
