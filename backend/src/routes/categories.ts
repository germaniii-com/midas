import { FastifyInstance } from 'fastify';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '@midas/core';

interface CreateCategoryBody {
  name: string;
}

interface UpdateCategoryBody {
  name?: string;
}

export async function categoryRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/binders/:id/categories', async (req, reply) => {
    const list = await listCategories(req.params.id);
    return reply.send(list);
  });

  app.post<{ Params: { id: string }; Body: CreateCategoryBody }>(
    '/binders/:id/categories/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name } = req.body;
      try {
        const category = await createCategory(id, { name });
        return reply.status(201).send(category);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (err.message.includes('already exists'))
          return reply.status(409).send({ error: err.message });
        if (err.message.includes('required')) return reply.status(400).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string; categoryId: string } }>(
    '/binders/:id/categories/:categoryId',
    async (req, reply) => {
      const category = await getCategory(req.params.id, req.params.categoryId);
      if (!category) {
        return reply.status(404).send({ error: 'Category not found' });
      }
      return reply.send(category);
    },
  );

  app.put<{ Params: { id: string; categoryId: string }; Body: UpdateCategoryBody }>(
    '/binders/:id/categories/:categoryId',
    async (req, reply) => {
      const { id, categoryId } = req.params;
      const { name } = req.body;
      try {
        const category = await updateCategory(id, categoryId, { name });
        return reply.send(category);
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

  app.delete<{ Params: { id: string; categoryId: string } }>(
    '/binders/:id/categories/:categoryId',
    async (req, reply) => {
      const { id, categoryId } = req.params;
      try {
        await deleteCategory(id, categoryId);
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
