import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreDist = resolve(
  __dirname,
  '..',
  'release-backend-deps',
  'node_modules',
  '@midas',
  'core',
  'dist',
  'index.js',
);

if (existsSync(coreDist)) {
  console.log('Electron core dependencies already present.');
} else {
  console.log('Generating Electron core dependencies (one-time)...');
  await import('./copy-backend-deps.js');
}
