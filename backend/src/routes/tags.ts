import { FastifyInstance } from 'fastify';
import { createTag, deleteTag, getTag, listTags, updateTag } from '@midas/core';

interface CreateTagBody {
  name: string;
  color?: string;
}

interface UpdateTagBody {
  name?: string;
  color?: string;
}

export async function tagRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/binders/:id/tags', async (req, reply) => {
    const list = await listTags(req.params.id);
    return reply.send(list);
  });

  app.post<{ Params: { id: string }; Body: CreateTagBody }>(
    '/binders/:id/tags/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name, color } = req.body;
      try {
        const tag = await createTag(id, { name, color });
        return reply.status(201).send(tag);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (err.message.includes('already exists'))
          return reply.status(409).send({ error: err.message });
        if (err.message.includes('required')) return reply.status(400).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string; tagId: string } }>(
    '/binders/:id/tags/:tagId',
    async (req, reply) => {
      const tag = await getTag(req.params.id, req.params.tagId);
      if (!tag) {
        return reply.status(404).send({ error: 'Tag not found' });
      }
      return reply.send(tag);
    },
  );

  app.put<{ Params: { id: string; tagId: string }; Body: UpdateTagBody }>(
    '/binders/:id/tags/:tagId',
    async (req, reply) => {
      const { id, tagId } = req.params;
      const { name, color } = req.body;
      try {
        const tag = await updateTag(id, tagId, { name, color });
        return reply.send(tag);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (err.message.includes('already exists'))
          return reply.status(409).send({ error: err.message });
        if (err.message.includes('empty')) return reply.status(400).send({ error: err.message });
        if (err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string; tagId: string } }>(
    '/binders/:id/tags/:tagId',
    async (req, reply) => {
      const { id, tagId } = req.params;
      try {
        await deleteTag(id, tagId);
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
