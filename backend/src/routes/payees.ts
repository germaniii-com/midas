import { FastifyInstance } from 'fastify';
import { createPayee, deletePayee, getPayee, listPayees, updatePayee } from '@midas/core';

interface CreatePayeeBody {
  name: string;
}

interface UpdatePayeeBody {
  name?: string;
}

export async function payeeRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/binders/:id/payees', async (req, reply) => {
    const list = await listPayees(req.params.id);
    return reply.send(list);
  });

  app.post<{ Params: { id: string }; Body: CreatePayeeBody }>(
    '/binders/:id/payees/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name } = req.body;
      try {
        const payee = await createPayee(id, { name });
        return reply.status(201).send(payee);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (err.message.includes('already exists'))
          return reply.status(409).send({ error: err.message });
        if (err.message.includes('required')) return reply.status(400).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string; payeeId: string } }>(
    '/binders/:id/payees/:payeeId',
    async (req, reply) => {
      const payee = await getPayee(req.params.id, req.params.payeeId);
      if (!payee) {
        return reply.status(404).send({ error: 'Payee not found' });
      }
      return reply.send(payee);
    },
  );

  app.put<{ Params: { id: string; payeeId: string }; Body: UpdatePayeeBody }>(
    '/binders/:id/payees/:payeeId',
    async (req, reply) => {
      const { id, payeeId } = req.params;
      const { name } = req.body;
      try {
        const payee = await updatePayee(id, payeeId, { name });
        return reply.send(payee);
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

  app.delete<{ Params: { id: string; payeeId: string } }>(
    '/binders/:id/payees/:payeeId',
    async (req, reply) => {
      const { id, payeeId } = req.params;
      try {
        await deletePayee(id, payeeId);
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
