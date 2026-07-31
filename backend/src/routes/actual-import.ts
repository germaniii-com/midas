import { FastifyInstance } from 'fastify';
import type { Multipart } from '@fastify/multipart';
import { importFromActual } from '@midas/core';

function getFieldValue(field: Multipart | Multipart[] | undefined): string {
  if (!field) return '';
  if (Array.isArray(field)) return getFieldValue(field[0]);
  if (field.type === 'field') return String(field.value ?? '');
  return '';
}

export async function actualImportRoutes(app: FastifyInstance) {
  app.post('/binders/import-actual', async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    const password = getFieldValue(data.fields.password).trim();
    const nameOverride = getFieldValue(data.fields.name).trim();
    const currencyOverride = getFieldValue(data.fields.currency).trim();

    if (!password) {
      return reply.status(400).send({ error: 'Password is required' });
    }

    try {
      const binder = await importFromActual(
        fileBuffer,
        password,
        nameOverride || undefined,
        currencyOverride || undefined,
      );
      return reply.status(201).send(binder);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      console.error('=== ACTUAL IMPORT ERROR ===', err);
      return reply.status(400).send({ error: message });
    }
  });
}
