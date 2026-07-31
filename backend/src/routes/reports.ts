import { FastifyInstance } from 'fastify';
import {
  getAccountTrends,
  getCashFlowReport,
  getForecast,
  getPayeeAnalysis,
  getSpendingBreakdown,
} from '@midas/core';

export async function reportRoutes(app: FastifyInstance) {
  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      interval?: 'daily' | 'weekly' | 'monthly';
      accountIds?: string;
      tagIds?: string;
    };
  }>('/binders/:id/reports/cash-flow', async (req, reply) => {
    const { id } = req.params;
    const { startDate, endDate, interval, accountIds, tagIds } = req.query;

    const accountIdList = accountIds
      ? accountIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const tagIdList = tagIds
      ? tagIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const result = await getCashFlowReport(id, {
      startDate,
      endDate,
      interval,
      accountIds: accountIdList,
      tagIds: tagIdList,
    });
    return reply.send(result);
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      transactionType?: 'income' | 'expense';
      groupBy?: 'category' | 'tags';
      includeTagIds?: string;
      excludeTagIds?: string;
    };
  }>('/binders/:id/reports/spending-breakdown', async (req, reply) => {
    const { id } = req.params;
    const { startDate, endDate, transactionType, groupBy, includeTagIds, excludeTagIds } =
      req.query;

    const includeTagIdList = includeTagIds
      ? includeTagIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const excludeTagIdList = excludeTagIds
      ? excludeTagIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const result = await getSpendingBreakdown(id, {
      startDate,
      endDate,
      transactionType,
      groupBy,
      includeTagIds: includeTagIdList,
      excludeTagIds: excludeTagIdList,
    });
    return reply.send(result);
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      sortBy?: 'amount' | 'count';
      limit?: string;
    };
  }>('/binders/:id/reports/payee-analysis', async (req, reply) => {
    const { id } = req.params;
    const { startDate, endDate, sortBy, limit } = req.query;

    const result = await getPayeeAnalysis(id, {
      startDate,
      endDate,
      sortBy,
      limit: parseInt(limit || '10'),
    });
    return reply.send(result);
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      interval?: 'daily' | 'weekly' | 'monthly';
    };
  }>('/binders/:id/reports/account-trends', async (req, reply) => {
    const { id } = req.params;
    const { startDate, endDate, interval } = req.query;

    const result = await getAccountTrends(id, { startDate, endDate, interval });
    return reply.send(result);
  });

  app.get<{
    Params: { id: string };
    Querystring: {
      accountId: string;
      horizonDays?: string;
      includeDrafts?: string;
    };
  }>('/binders/:id/reports/forecast', async (req, reply) => {
    const { id } = req.params;
    const { accountId, horizonDays, includeDrafts } = req.query;

    if (!accountId) {
      return reply.status(400).send({ error: 'accountId is required' });
    }

    const horizon = parseInt(horizonDays || '30') || 30;
    const result = await getForecast(id, {
      accountId,
      horizonDays: horizon,
      includeDrafts: includeDrafts === 'true',
    });
    return reply.send(result);
  });
}
