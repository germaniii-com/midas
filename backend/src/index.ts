import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { binderRoutes } from './routes/binders';
import { binderIORoutes } from './routes/binder-io';
import { actualImportRoutes } from './routes/actual-import';
import { tagRoutes } from './routes/tags';
import { categoryRoutes } from './routes/categories';
import { accountRoutes } from './routes/accounts';
import { transactionRoutes } from './routes/transactions';
import { payeeRoutes } from './routes/payees';
import { paymentScheduleRoutes } from './routes/payment-schedules';
import { reportRoutes } from './routes/reports';
import { attachmentRoutes } from './routes/attachments';
import { syncRoutes } from './routes/sync';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';
import { storage } from './storage';
import { SyncScheduler } from './services/sync-scheduler';

const app = Fastify({ logger: true });

app.register(cors);
app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

async function routes(app: FastifyInstance) {
  app.get('/health', async (_req, _reply) => {
    return { status: 'ok' };
  });
  app.register(binderRoutes);
  app.register(binderIORoutes);
  app.register(actualImportRoutes);
  app.register(tagRoutes);
  app.register(categoryRoutes);
  app.register(accountRoutes);
  app.register(transactionRoutes);
  app.register(payeeRoutes);
  app.register(paymentScheduleRoutes);
  app.register(reportRoutes);
  app.register(attachmentRoutes);
  app.register(syncRoutes);
}

app.register(routes, { prefix: '/api' });

const start = async () => {
  try {
    migrate(db, { migrationsFolder: './drizzle' });
    await storage.init();

    SyncScheduler.init();
    SyncScheduler.getInstance().loadAll().catch((err) => {
      console.error('Failed to load auto-sync jobs:', err);
    });

    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
