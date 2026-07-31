import { FastifyInstance } from 'fastify';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from '@midas/core';

interface CreateTransactionBody {
  accountId: string;
  amount: string;
  date: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

interface UpdateTransactionBody {
  accountId?: string;
  amount?: string;
  date?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get<{
    Params: { id: string };
    Querystring: { accountId?: string; categoryId?: string; limit?: string; offset?: string };
  }>('/binders/:id/transactions', async (req, reply) => {
    const { id } = req.params;
    const { accountId, categoryId, limit: limitStr, offset: offsetStr } = req.query;
    const limit = Math.min(Math.max(parseInt(limitStr || '50') || 50, 1), 500);
    const offset = Math.max(parseInt(offsetStr || '0') || 0, 0);

    const result = await listTransactions(id, { accountId, categoryId, limit, offset });
    return reply.send(result);
  });

  app.post<{ Params: { id: string }; Body: CreateTransactionBody }>(
    '/binders/:id/transactions/create',
    async (req, reply) => {
      const { id } = req.params;
      const { accountId, amount, date, payeeId, transferAccountId, notes, isCleared, tagIds } =
        req.body;
      try {
        const tx = await createTransaction(id, {
          accountId,
          amount,
          date,
          payeeId,
          transferAccountId,
          notes,
          isCleared,
          tagIds,
        });
        return reply.status(201).send(tx);
      } catch (err) {
        if (err instanceof Error && err.message.includes('required')) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;
      const tx = await getTransaction(id, transactionId);
      if (!tx) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }
      return reply.send(tx);
    },
  );

  app.put<{ Params: { id: string; transactionId: string }; Body: UpdateTransactionBody }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;
      const { accountId, amount, date, payeeId, transferAccountId, notes, isCleared, tagIds } =
        req.body;
      try {
        const tx = await updateTransaction(id, transactionId, {
          accountId,
          amount,
          date,
          payeeId,
          transferAccountId,
          notes,
          isCleared,
          tagIds,
        });
        return reply.send(tx);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;
      try {
        await deleteTransaction(id, transactionId);
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
