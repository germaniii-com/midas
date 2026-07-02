const { readFileSync, writeFileSync, chmodSync } = require('fs')
const { resolve } = require('path')

const entry = resolve(__dirname, '..', 'dist', 'index.js')

try {
  const content = readFileSync(entry, 'utf-8')
  if (!content.startsWith('#!')) {
    writeFileSync(entry, '#!/usr/bin/env node\n' + content)
  }
  chmodSync(entry, 0o755)
  console.log('Post-build: made dist/index.js executable')
} catch (err) {
  console.error('Post-build error:', err.message)
  process.exit(1)
}
