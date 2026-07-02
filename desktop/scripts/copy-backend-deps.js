import { readFileSync, existsSync, mkdirSync, writeFileSync, cpSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, sep } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..', '..')
const backendPkgPath = resolve(rootDir, 'backend', 'package.json')
const backendPkg = JSON.parse(readFileSync(backendPkgPath, 'utf-8'))

const deps = { ...backendPkg.dependencies }
const targetDir = resolve(__dirname, '..', 'release-backend-deps')
const nodeModulesDir = resolve(targetDir, 'node_modules')

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true })
}

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

function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }
  for (const entry of readdirSync(src)) {
    if (entry === '.bin') continue
    const srcPath = resolve(src, entry)
    const destPath = resolve(dest, entry)
    const stat = statSync(srcPath)
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      try {
        cpSync(srcPath, destPath, { dereference: true })
      } catch {
        // Fallback: copy as symlink if dereference fails
        try { cpSync(srcPath, destPath) } catch {}
      }
    }
  }
}

const seen = new Set()
let count = 0

function copyDep(name) {
  if (seen.has(name)) return
  seen.add(name)

  const resolved = resolveModule(name)
  if (!resolved) return

  const target = resolve(targetDir, 'node_modules', name)
  copyDir(resolved, target)
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

function dirSize(dir) {
  let size = 0
  try {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        size += dirSize(full)
      } else {
        size += stat.size
      }
    }
  } catch {}
  return size
}

const bytes = dirSize(targetDir)
const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(`Copied ${count} backend dependencies (${mb}MB) to ${nodeModulesDir}`)

// Create a package.json inside node_modules for electron-rebuild to scan
writeFileSync(
  resolve(nodeModulesDir, 'package.json'),
  JSON.stringify(
    {
      name: 'backend-deps',
      version: '1.0.0',
      private: true,
      dependencies: deps,
    },
    null,
    2,
  ),
)

// Rebuild native modules for Electron's Node.js version
const electronVersion = JSON.parse(
  readFileSync(resolve(rootDir, 'node_modules', 'electron', 'package.json'), 'utf-8'),
).version
console.log(`Rebuilding native modules for Electron ${electronVersion} ...`)

try {
  execSync(
    `npx --yes @electron/rebuild` +
      ` --version "${electronVersion}"` +
      ` --module-dir "${nodeModulesDir}"` +
      ` --arch "${process.arch}"` +
      ` --force`,
    { cwd: rootDir, stdio: 'inherit', timeout: 120000 },
  )
  console.log('Native modules rebuilt successfully')
} catch (err) {
  console.warn('Native module rebuild failed:', err.message)
  console.warn('The app may still work if native modules are not required')
}
