/**
 * Completes package-lock.json with platform-specific optional dependency entries
 * (rollup, esbuild, sharp, tailwindcss/oxide, lightningcss, ...).
 *
 * npm 10 has a bug (https://github.com/npm/cli/issues/4828) where optional deps
 * for OTHER platforms are never added to the lockfile, so `npm ci` fails on CI
 * runners whose platform differs from the machine that generated the lock.
 *
 * This adds every missing platform package to the root devDependencies, runs
 * `npm install --force` (so npm resolves + records each entry), then restores
 * package.json. The lockfile keeps the completed entries.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const pkgPath = 'package.json';
const lockPath = 'package-lock.json';

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const pkgs = lock.packages;

const missing = new Map();
for (const [key, entry] of Object.entries(pkgs)) {
  if (!entry.optionalDependencies) continue;
  for (const [name, ver] of Object.entries(entry.optionalDependencies)) {
    if (!pkgs['node_modules/' + name]) missing.set(name, ver);
  }
}

if (missing.size === 0) {
  console.log('Lockfile is already complete.');
  process.exit(0);
}

console.log(`Adding ${missing.size} platform-specific optional deps to the lockfile...`);

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const backup = JSON.stringify(pkg, null, 2) + '\n';
pkg.devDependencies = { ...pkg.devDependencies };
for (const [name, ver] of missing) {
  pkg.devDependencies[name] = ver;
}
fs.writeFileSync(pkgPath, backup);

try {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  execSync('npm install --force', { stdio: 'inherit' });
} finally {
  fs.writeFileSync(pkgPath, backup);
}

const lock2 = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
let stillMissing = 0;
for (const [name, ver] of missing) {
  if (!lock2.packages['node_modules/' + name]) {
    console.log(`  still missing: ${name}@${ver}`);
    stillMissing++;
  }
}
console.log(stillMissing === 0 ? 'Lockfile complete.' : `${stillMissing} entries still missing.`);
process.exit(stillMissing === 0 ? 0 : 1);
