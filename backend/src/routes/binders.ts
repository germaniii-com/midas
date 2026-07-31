import { FastifyInstance } from 'fastify';
import { createBinder, getBinder, listBinders, loginBinder, updateBinder } from '@midas/core';

interface CreateBinderBody {
  name: string;
  password: string;
  description?: string;
  currency?: string;
}

interface LoginBody {
  name: string;
  password: string;
}

export async function binderRoutes(app: FastifyInstance) {
  app.get('/binders', async (_req, reply) => {
    const binders = await listBinders();
    return reply.send(binders);
  });

  app.post<{ Body: CreateBinderBody }>('/binders', async (req, reply) => {
    const { name, password, description, currency } = req.body;
    try {
      const binder = await createBinder({ name, password, description, currency });
      return reply.status(201).send(binder);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return reply.status(409).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get<{ Params: { id: string } }>('/binders/:id', async (req, reply) => {
    const binder = await getBinder(req.params.id);
    if (!binder) {
      return reply.status(404).send({ error: 'Binder not found' });
    }
    return reply.send(binder);
  });

  app.put<{ Params: { id: string }; Body: { name?: string; currency?: string } }>(
    '/binders/:id',
    async (req, reply) => {
      const { name, currency } = req.body;
      try {
        const binder = await updateBinder(req.params.id, { name, currency });
        return reply.send(binder);
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

  app.post<{ Body: LoginBody }>('/binders/login', async (req, reply) => {
    const { name, password } = req.body;
    try {
      const session = await loginBinder(name, password);
      return reply.send(session);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid')) {
        return reply.status(401).send({ error: err.message });
      }
      throw err;
    }
  });
}
