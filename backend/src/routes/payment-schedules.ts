import { FastifyInstance } from 'fastify';
import {
  createPaymentSchedule,
  deletePaymentSchedule,
  getPaymentSchedule,
  getUpcomingPaymentSchedules,
  listPaymentSchedules,
  payPaymentSchedule,
  previewPaymentSchedule,
  updatePaymentSchedule,
  type CreateScheduleInput,
  type ScheduleRule,
} from '@midas/core';

type CreateScheduleBody = CreateScheduleInput;

type UpdateScheduleBody = Partial<CreateScheduleInput>;

export async function paymentScheduleRoutes(app: FastifyInstance) {
  app.get<{
    Params: { id: string };
    Querystring: {
      repeatInterval?: string;
      repeatType?: string;
      startDate?: string;
      endType?: string;
      endDate?: string;
      endOccurrences?: string;
      specificDays?: string;
      weekendAdjustment?: string;
      count?: string;
    };
  }>('/binders/:id/payment-schedules/preview', async (req, reply) => {
    const {
      repeatInterval = '1',
      repeatType = 'month',
      startDate,
      endType = 'never',
      endDate,
      endOccurrences,
      specificDays,
      weekendAdjustment = 'none',
      count = '5',
    } = req.query;

    if (!startDate) {
      return reply.send([]);
    }

    const rule: ScheduleRule = {
      repeatInterval: parseInt(repeatInterval) || 1,
      repeatType: (repeatType || 'month') as ScheduleRule['repeatType'],
      startDate,
      endType: (endType || 'never') as ScheduleRule['endType'],
      endDate: endDate || null,
      endOccurrences: endOccurrences ? parseInt(endOccurrences) || null : null,
      specificDays: specificDays
        ? specificDays
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      weekendAdjustment: (weekendAdjustment || 'none') as ScheduleRule['weekendAdjustment'],
    };

    const dates = await previewPaymentSchedule(rule, parseInt(count) || 5);
    return reply.send(dates);
  });

  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string; includeInactive?: string };
  }>('/binders/:id/payment-schedules', async (req, reply) => {
    const { id } = req.params;
    const { limit: limitStr, offset: offsetStr, includeInactive } = req.query;
    const limit = Math.min(Math.max(parseInt(limitStr || '50') || 50, 1), 500);
    const offset = Math.max(parseInt(offsetStr || '0') || 0, 0);

    const rows = await listPaymentSchedules(id, {
      limit,
      offset,
      includeInactive: includeInactive === 'true',
    });
    return reply.send(rows);
  });

  app.get<{ Params: { id: string; scheduleId: string } }>(
    '/binders/:id/payment-schedules/:scheduleId',
    async (req, reply) => {
      const { id, scheduleId } = req.params;
      const schedule = await getPaymentSchedule(id, scheduleId);
      if (!schedule) {
        return reply.status(404).send({ error: 'Payment schedule not found' });
      }
      return reply.send(schedule);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateScheduleBody }>(
    '/binders/:id/payment-schedules/create',
    async (req, reply) => {
      const { id } = req.params;
      const {
        name,
        accountId,
        payeeId,
        transferAccountId,
        amount,
        repeatInterval,
        repeatType,
        startDate,
        endType,
        endDate,
        endOccurrences,
        specificDays,
        weekendAdjustment,
        notifyBefore,
        notifyType,
        isActive,
      } = req.body;

      try {
        const schedule = await createPaymentSchedule(id, {
          name,
          accountId,
          payeeId,
          transferAccountId,
          amount,
          repeatInterval,
          repeatType,
          startDate,
          endType,
          endDate,
          endOccurrences,
          specificDays,
          weekendAdjustment,
          notifyBefore,
          notifyType,
          isActive,
        });
        return reply.status(201).send(schedule);
      } catch (err) {
        if (err instanceof Error && err.message.includes('required')) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.put<{ Params: { id: string; scheduleId: string }; Body: UpdateScheduleBody }>(
    '/binders/:id/payment-schedules/:scheduleId',
    async (req, reply) => {
      const { id, scheduleId } = req.params;
      try {
        const schedule = await updatePaymentSchedule(id, scheduleId, req.body);
        return reply.send(schedule);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string; scheduleId: string } }>(
    '/binders/:id/payment-schedules/:scheduleId',
    async (req, reply) => {
      const { id, scheduleId } = req.params;
      try {
        await deletePaymentSchedule(id, scheduleId);
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { id: string; scheduleId: string } }>(
    '/binders/:id/payment-schedules/:scheduleId/pay',
    async (req, reply) => {
      const { id, scheduleId } = req.params;
      try {
        const result = await payPaymentSchedule(id, scheduleId);
        return reply.status(201).send(result);
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        if (err.message.includes('No upcoming'))
          return reply.status(400).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    '/binders/:id/payment-schedules/upcoming',
    async (req, reply) => {
      const { id } = req.params;
      const results = await getUpcomingPaymentSchedules(id);
      return reply.send(results);
    },
  );
}
