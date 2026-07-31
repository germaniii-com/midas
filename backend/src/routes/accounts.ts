import { FastifyInstance } from 'fastify';
import { createAccount, deleteAccount, getAccount, listAccounts, updateAccount } from '@midas/core';

interface CreateAccountBody {
  name: string;
  type: string;
  categoryIds?: string[];
}

interface UpdateAccountBody {
  name?: string;
  type?: string;
  categoryIds?: string[];
}

export async function accountRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/binders/:id/accounts', async (req, reply) => {
    const { accounts, categorySums } = await listAccounts(req.params.id);
    return reply.send({ accounts, categorySums });
  });

  app.post<{ Params: { id: string }; Body: CreateAccountBody }>(
    '/binders/:id/accounts/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name, type, categoryIds } = req.body;
      try {
        const account = await createAccount(id, { name, type, categoryIds });
        return reply.status(201).send(account);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (err.message.includes('already exists'))
          return reply.status(409).send({ error: err.message });
        if (err.message.includes('required')) return reply.status(400).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string; accountId: string } }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const account = await getAccount(req.params.id, req.params.accountId);
      if (!account) {
        return reply.status(404).send({ error: 'Account not found' });
      }
      return reply.send(account);
    },
  );

  app.put<{ Params: { id: string; accountId: string }; Body: UpdateAccountBody }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const { id, accountId } = req.params;
      const { name, type, categoryIds } = req.body;
      try {
        const account = await updateAccount(id, accountId, { name, type, categoryIds });
        return reply.send(account);
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

  app.delete<{ Params: { id: string; accountId: string } }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const { id, accountId } = req.params;
      try {
        await deleteAccount(id, accountId);
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
