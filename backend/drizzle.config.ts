import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_DIR
      ? path.join(process.env.DATABASE_DIR, 'midas.db')
      : './sqlite_data/midas.db',
  },
});
