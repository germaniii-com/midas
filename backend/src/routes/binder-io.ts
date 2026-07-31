import { FastifyInstance } from 'fastify';
import type { Multipart } from '@fastify/multipart';
import { exportBinder, importBinder } from '@midas/core';

function getFieldValue(field: Multipart | Multipart[] | undefined): string {
  if (!field) return '';
  if (Array.isArray(field)) return getFieldValue(field[0]);
  if (field.type === 'field') return String(field.value ?? '');
  return '';
}

export async function binderIORoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/binders/:id/export', async (req, reply) => {
    const { id } = req.params;

    try {
      const sqlContent = await exportBinder(id);

      const filename = `${new Date().toISOString().slice(0, 10)}-export.sql`;
      reply.header('Content-Type', 'application/sql');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(sqlContent);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        return reply.status(404).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post('/binders/import', async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const sqlContent = Buffer.concat(chunks).toString('utf-8').trim();

    if (!sqlContent) {
      return reply.status(400).send({ error: 'Empty file' });
    }

    const password = getFieldValue(data.fields.password).trim();
    const nameOverride = getFieldValue(data.fields.name).trim();
    const descriptionOverride = getFieldValue(data.fields.description).trim();
    const currencyOverride = getFieldValue(data.fields.currency).trim();

    if (!password) {
      return reply.status(400).send({ error: 'Password is required' });
    }

    try {
      const binder = await importBinder(
        sqlContent,
        password,
        nameOverride || undefined,
        descriptionOverride || undefined,
        currencyOverride || undefined,
      );
      return reply.status(201).send(binder);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      return reply.status(400).send({ error: message });
    }
  });
}
