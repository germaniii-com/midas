import { FastifyInstance } from 'fastify';
import {
  deleteAttachment,
  getAttachment,
  getAttachmentFile,
  getAttachmentThumbnail,
  listAttachments,
  uploadAttachment,
} from '@midas/core';

async function getAttachmentRow(transactionId: string, attachmentId: string) {
  return getAttachment(transactionId, attachmentId);
}

export async function attachmentRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments',
    async (req, reply) => {
      const { id: binderId, transactionId } = req.params;

      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ error: 'File is required' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const attachment = await uploadAttachment(binderId, transactionId, {
        buffer,
        fileName: data.filename,
        mimeType: data.mimetype || 'application/octet-stream',
      });

      return reply.status(201).send(attachment);
    },
  );

  app.get<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments',
    async (req, reply) => {
      const { id: binderId, transactionId } = req.params;
      const attachments = await listAttachments(binderId, transactionId);
      return reply.send(attachments);
    },
  );

  app.get<{
    Params: { id: string; transactionId: string; attachmentId: string };
    Querystring: { preview?: string };
  }>('/binders/:id/transactions/:transactionId/attachments/:attachmentId', async (req, reply) => {
    const { transactionId, attachmentId } = req.params;
    const preview = req.query.preview === 'true';

    const attachment = await getAttachmentRow(transactionId, attachmentId);
    if (!attachment) {
      return reply.status(404).send({ error: 'Attachment not found' });
    }

    const file = await getAttachmentFile(attachmentId).catch(() => null);
    if (!file) {
      return reply.status(404).send({ error: 'File not found in storage' });
    }

    return reply
      .header('Content-Type', file.mimeType)
      .header(
        'Content-Disposition',
        preview
          ? `inline; filename="${attachment.fileName}"`
          : `attachment; filename="${attachment.fileName}"`,
      )
      .send(file.buffer);
  });

  app.get<{ Params: { id: string; transactionId: string; attachmentId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments/:attachmentId/thumbnail',
    async (req, reply) => {
      const { transactionId, attachmentId } = req.params;

      const attachment = await getAttachmentRow(transactionId, attachmentId);
      if (!attachment) {
        return reply.status(404).send({ error: 'Attachment not found' });
      }

      const isImage = attachment.mimeType?.startsWith('image/');
      if (!isImage) {
        return reply.status(400).send({ error: 'Thumbnail not available for non-image files' });
      }

      const thumbnail = await getAttachmentThumbnail(attachmentId).catch(() => null);
      if (!thumbnail) {
        return reply.status(404).send({ error: 'File not found in storage' });
      }

      return reply
        .header('Content-Type', thumbnail.mimeType)
        .header('Cache-Control', 'public, max-age=86400')
        .send(thumbnail.buffer);
    },
  );

  app.delete<{ Params: { id: string; transactionId: string; attachmentId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments/:attachmentId',
    async (req, reply) => {
      const { transactionId, attachmentId } = req.params;

      try {
        await deleteAttachment(transactionId, attachmentId);
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
