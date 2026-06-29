import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';

const dbDir = process.env.DATABASE_DIR || path.resolve(__dirname, '../sqlite_data');
const dbPath = path.join(dbDir, 'midas.db');

function main() {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Deleted ${dbPath}`);
  }

  fs.mkdirSync(dbDir, { recursive: true });

  console.log('Running migrations...');
  execSync('npx drizzle-kit migrate', { stdio: 'inherit' });

  console.log('Done!');
}

main();
