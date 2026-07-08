import { FastifyInstance } from 'fastify';
import { eq, and, sql, inArray, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../db';
import {
  paymentSchedules,
  paymentScheduleOccurrences,
  accounts,
  payees,
  transactions,
} from '../db/schema';
import { computeNextOccurrences, type ScheduleRule } from '../recurrence';

function flipAmount(amount: string): string {
  return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
}

interface CreateScheduleBody {
  name: string;
  accountId: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType?: 'never' | 'date' | 'after';
  endDate?: string | null;
  endOccurrences?: number | null;
  specificDays?: string[] | null;
  weekendAdjustment?: 'none' | 'before' | 'after';
  notifyBefore?: number;
  notifyType?: 'days' | 'weeks' | 'months';
  isActive?: boolean;
}

interface UpdateScheduleBody {
  name?: string;
  accountId?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  amount?: string;
  repeatInterval?: number;
  repeatType?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endType?: 'never' | 'date' | 'after';
  endDate?: string | null;
  endOccurrences?: number | null;
  specificDays?: string[] | null;
  weekendAdjustment?: 'none' | 'before' | 'after';
  notifyBefore?: number;
  notifyType?: 'days' | 'weeks' | 'months';
  isActive?: boolean;
}

function computeScheduleStatus(dueDate: string): 'overdue' | 'due_soon' | 'upcoming' | 'missed' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due_soon';
  return 'upcoming';
}

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
  }>(
    '/binders/:id/payment-schedules/preview',
    async (req, reply) => {
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
        specificDays: specificDays ? specificDays.split(',').map(s => s.trim()).filter(Boolean) : null,
        weekendAdjustment: (weekendAdjustment || 'none') as ScheduleRule['weekendAdjustment'],
      };

      const occurrences = computeNextOccurrences(rule, [], parseInt(count) || 5);
      return reply.send(occurrences.map(o => o.dueDate));
    },
  );

  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string; includeInactive?: string };
  }>(
    '/binders/:id/payment-schedules',
    async (req, reply) => {
      const { id } = req.params;
      const { limit: limitStr, offset: offsetStr, includeInactive } = req.query;
      const limit = Math.min(Math.max(parseInt(limitStr || '50') || 50, 1), 500);
      const offset = Math.max(parseInt(offsetStr || '0') || 0, 0);

      const filters: any[] = [eq(paymentSchedules.binderId, id)];
      if (includeInactive !== 'true') {
        filters.push(eq(paymentSchedules.isActive, true));
      }

      const transferAccount = alias(accounts, 'transfer_account');

      const rows = await db
        .select({
          id: paymentSchedules.id,
          binderId: paymentSchedules.binderId,
          name: paymentSchedules.name,
          accountId: paymentSchedules.accountId,
          accountName: accounts.name,
          payeeId: paymentSchedules.payeeId,
          payeeName: payees.name,
          transferAccountId: paymentSchedules.transferAccountId,
          transferAccountName: transferAccount.name,
          amount: paymentSchedules.amount,
          repeatInterval: paymentSchedules.repeatInterval,
          repeatType: paymentSchedules.repeatType,
          startDate: paymentSchedules.startDate,
          endType: paymentSchedules.endType,
          endDate: paymentSchedules.endDate,
          endOccurrences: paymentSchedules.endOccurrences,
          specificDays: paymentSchedules.specificDays,
          weekendAdjustment: paymentSchedules.weekendAdjustment,
          notifyBefore: paymentSchedules.notifyBefore,
          notifyType: paymentSchedules.notifyType,
          isActive: paymentSchedules.isActive,
          createdAt: paymentSchedules.createdAt,
        })
        .from(paymentSchedules)
        .leftJoin(accounts, eq(paymentSchedules.accountId, accounts.id))
        .leftJoin(payees, eq(paymentSchedules.payeeId, payees.id))
        .leftJoin(transferAccount, eq(paymentSchedules.transferAccountId, transferAccount.id))
        .where(and(...filters))
        .orderBy(desc(paymentSchedules.isActive), asc(paymentSchedules.name))
        .limit(limit)
        .offset(offset);

      return reply.send(rows);
    },
  );

  app.get<{ Params: { id: string; scheduleId: string } }>(
    '/binders/:id/payment-schedules/:scheduleId',
    async (req, reply) => {
      const { id, scheduleId } = req.params;
      const transferAccount = alias(accounts, 'transfer_account');

      const [row] = await db
        .select({
          id: paymentSchedules.id,
          binderId: paymentSchedules.binderId,
          name: paymentSchedules.name,
          accountId: paymentSchedules.accountId,
          accountName: accounts.name,
          payeeId: paymentSchedules.payeeId,
          payeeName: payees.name,
          transferAccountId: paymentSchedules.transferAccountId,
          transferAccountName: transferAccount.name,
          amount: paymentSchedules.amount,
          repeatInterval: paymentSchedules.repeatInterval,
          repeatType: paymentSchedules.repeatType,
          startDate: paymentSchedules.startDate,
          endType: paymentSchedules.endType,
          endDate: paymentSchedules.endDate,
          endOccurrences: paymentSchedules.endOccurrences,
          specificDays: paymentSchedules.specificDays,
          weekendAdjustment: paymentSchedules.weekendAdjustment,
          notifyBefore: paymentSchedules.notifyBefore,
          notifyType: paymentSchedules.notifyType,
          isActive: paymentSchedules.isActive,
          createdAt: paymentSchedules.createdAt,
        })
        .from(paymentSchedules)
        .leftJoin(accounts, eq(paymentSchedules.accountId, accounts.id))
        .leftJoin(payees, eq(paymentSchedules.payeeId, payees.id))
        .leftJoin(transferAccount, eq(paymentSchedules.transferAccountId, transferAccount.id))
        .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, id)));

      if (!row) {
        return reply.status(404).send({ error: 'Payment schedule not found' });
      }

      return reply.send(row);
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
        endType = 'never',
        endDate,
        endOccurrences,
        specificDays,
        weekendAdjustment = 'none',
        notifyBefore = 7,
        notifyType = 'days',
        isActive = true,
      } = req.body;

      if (!name?.trim()) {
        return reply.status(400).send({ error: 'Name is required' });
      }
      if (!accountId) {
        return reply.status(400).send({ error: 'Account is required' });
      }
      if (!amount) {
        return reply.status(400).send({ error: 'Amount is required' });
      }
      if (!repeatType) {
        return reply.status(400).send({ error: 'Repeat type is required' });
      }
      if (!startDate) {
        return reply.status(400).send({ error: 'Start date is required' });
      }

      const [schedule] = await db
        .insert(paymentSchedules)
        .values({
          binderId: id,
          name: name.trim(),
          accountId,
          payeeId: payeeId ?? null,
          transferAccountId: transferAccountId ?? null,
          amount,
          repeatInterval: repeatInterval ?? 1,
          repeatType,
          startDate,
          endType,
          endDate: endDate ?? null,
          endOccurrences: endOccurrences ?? null,
          specificDays: specificDays ?? null,
          weekendAdjustment,
          notifyBefore,
          notifyType,
          isActive,
        })
        .returning();

      return reply.status(201).send(schedule);
    },
  );

  app.put<{ Params: { id: string; scheduleId: string }; Body: UpdateScheduleBody }>(
    '/binders/:id/payment-schedules/:scheduleId',
    async (req, reply) => {
      const { id, scheduleId } = req.params;

      const updates: Partial<typeof paymentSchedules.$inferInsert> = {};
      if (req.body.name !== undefined) updates.name = req.body.name.trim();
      if (req.body.accountId !== undefined) updates.accountId = req.body.accountId;
      if (req.body.payeeId !== undefined) updates.payeeId = req.body.payeeId || null;
      if (req.body.transferAccountId !== undefined) updates.transferAccountId = req.body.transferAccountId || null;
      if (req.body.amount !== undefined) updates.amount = req.body.amount;
      if (req.body.repeatInterval !== undefined) updates.repeatInterval = req.body.repeatInterval;
      if (req.body.repeatType !== undefined) updates.repeatType = req.body.repeatType;
      if (req.body.startDate !== undefined) updates.startDate = req.body.startDate;
      if (req.body.endType !== undefined) updates.endType = req.body.endType;
      if (req.body.endDate !== undefined) updates.endDate = req.body.endDate || null;
      if (req.body.endOccurrences !== undefined) updates.endOccurrences = req.body.endOccurrences || null;
      if (req.body.specificDays !== undefined) updates.specificDays = req.body.specificDays || null;
      if (req.body.weekendAdjustment !== undefined) updates.weekendAdjustment = req.body.weekendAdjustment;
      if (req.body.notifyBefore !== undefined) updates.notifyBefore = req.body.notifyBefore;
      if (req.body.notifyType !== undefined) updates.notifyType = req.body.notifyType;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

      const [schedule] = await db
        .update(paymentSchedules)
        .set(updates)
        .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, id)))
        .returning();

      if (!schedule) {
        return reply.status(404).send({ error: 'Payment schedule not found' });
      }

      return reply.send(schedule);
    },
  );

  app.delete<{ Params: { id: string; scheduleId: string } }>(
    '/binders/:id/payment-schedules/:scheduleId',
    async (req, reply) => {
      const { id, scheduleId } = req.params;

      await db
        .delete(paymentScheduleOccurrences)
        .where(eq(paymentScheduleOccurrences.scheduleId, scheduleId));

      const [schedule] = await db
        .delete(paymentSchedules)
        .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, id)))
        .returning({ id: paymentSchedules.id });

      if (!schedule) {
        return reply.status(404).send({ error: 'Payment schedule not found' });
      }

      return reply.status(204).send();
    },
  );

  app.post<{ Params: { id: string; scheduleId: string } }>(
    '/binders/:id/payment-schedules/:scheduleId/pay',
    async (req, reply) => {
      const { id, scheduleId } = req.params;

      const [schedule] = await db
        .select({
          id: paymentSchedules.id,
          name: paymentSchedules.name,
          accountId: paymentSchedules.accountId,
          payeeId: paymentSchedules.payeeId,
          transferAccountId: paymentSchedules.transferAccountId,
          amount: paymentSchedules.amount,
          repeatInterval: paymentSchedules.repeatInterval,
          repeatType: paymentSchedules.repeatType,
          startDate: paymentSchedules.startDate,
          endType: paymentSchedules.endType,
          endDate: paymentSchedules.endDate,
          endOccurrences: paymentSchedules.endOccurrences,
          specificDays: paymentSchedules.specificDays,
          weekendAdjustment: paymentSchedules.weekendAdjustment,
          notifyBefore: paymentSchedules.notifyBefore,
          notifyType: paymentSchedules.notifyType,
          isActive: paymentSchedules.isActive,
        })
        .from(paymentSchedules)
        .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, id)));

      if (!schedule) {
        return reply.status(404).send({ error: 'Payment schedule not found' });
      }

      const existingOccurrences = await db
        .select({
          dueDate: paymentScheduleOccurrences.dueDate,
        })
        .from(paymentScheduleOccurrences)
        .where(eq(paymentScheduleOccurrences.scheduleId, scheduleId));

      const paidDates = existingOccurrences.map((o) => o.dueDate);

      const rule: ScheduleRule = {
        repeatInterval: schedule.repeatInterval,
        repeatType: schedule.repeatType as ScheduleRule['repeatType'],
        startDate: schedule.startDate,
        endType: schedule.endType as ScheduleRule['endType'],
        endDate: schedule.endDate,
        endOccurrences: schedule.endOccurrences,
        specificDays: schedule.specificDays as string[] | null,
        weekendAdjustment: schedule.weekendAdjustment as ScheduleRule['weekendAdjustment'],
      };

      const nextOccurrences = computeNextOccurrences(rule, paidDates, 1, { includePast: true });
      if (nextOccurrences.length === 0) {
        return reply.status(400).send({ error: 'No upcoming occurrences to pay' });
      }

      const dueDate = nextOccurrences[0].dueDate;
      const today = new Date().toISOString().slice(0, 10);
      const signedAmount = schedule.amount;

      const [tx] = await db
        .insert(transactions)
        .values({
          binderId: id,
          accountId: schedule.accountId,
          amount: signedAmount,
          date: today,
          payeeId: schedule.payeeId,
          transferId: null,
          notes: `Scheduled: ${schedule.name} | ${dueDate}`,
          isCleared: true,
        })
        .returning();

      if (schedule.transferAccountId) {
        const counterpartAmount = flipAmount(signedAmount);
        const [counterpart] = await db
          .insert(transactions)
          .values({
            binderId: id,
            accountId: schedule.transferAccountId,
            amount: counterpartAmount,
            date: today,
            payeeId: null,
            transferId: tx.id,
            isCleared: true,
          })
          .returning();

        await db
          .update(transactions)
          .set({ transferId: counterpart.id })
          .where(eq(transactions.id, tx.id));

        tx.transferId = counterpart.id;
      }

      const [occurrence] = await db
        .insert(paymentScheduleOccurrences)
        .values({
          binderId: id,
          scheduleId,
          dueDate,
          transactionId: tx.id,
          paidAt: new Date().toISOString(),
        })
        .returning();

      return reply.status(201).send({ occurrence, transaction: tx });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/binders/:id/payment-schedules/upcoming',
    async (req, reply) => {
      const { id } = req.params;

      const transferAccount = alias(accounts, 'transfer_account');

      const schedules = await db
        .select({
          id: paymentSchedules.id,
          binderId: paymentSchedules.binderId,
          name: paymentSchedules.name,
          accountId: paymentSchedules.accountId,
          accountName: accounts.name,
          payeeId: paymentSchedules.payeeId,
          payeeName: payees.name,
          transferAccountId: paymentSchedules.transferAccountId,
          transferAccountName: transferAccount.name,
          amount: paymentSchedules.amount,
          repeatInterval: paymentSchedules.repeatInterval,
          repeatType: paymentSchedules.repeatType,
          startDate: paymentSchedules.startDate,
          endType: paymentSchedules.endType,
          endDate: paymentSchedules.endDate,
          endOccurrences: paymentSchedules.endOccurrences,
          specificDays: paymentSchedules.specificDays,
          weekendAdjustment: paymentSchedules.weekendAdjustment,
          notifyBefore: paymentSchedules.notifyBefore,
          notifyType: paymentSchedules.notifyType,
          isActive: paymentSchedules.isActive,
          createdAt: paymentSchedules.createdAt,
        })
        .from(paymentSchedules)
        .leftJoin(accounts, eq(paymentSchedules.accountId, accounts.id))
        .leftJoin(payees, eq(paymentSchedules.payeeId, payees.id))
        .leftJoin(transferAccount, eq(paymentSchedules.transferAccountId, transferAccount.id))
        .where(and(eq(paymentSchedules.binderId, id), eq(paymentSchedules.isActive, true)));

      if (schedules.length === 0) return reply.send([]);

      const scheduleIds = schedules.map((s) => s.id);
      const allOccurrences = await db
        .select({
          scheduleId: paymentScheduleOccurrences.scheduleId,
          dueDate: paymentScheduleOccurrences.dueDate,
          transactionId: paymentScheduleOccurrences.transactionId,
        })
        .from(paymentScheduleOccurrences)
        .where(inArray(paymentScheduleOccurrences.scheduleId, scheduleIds));

      const paidDatesBySchedule: Record<string, string[]> = {};
      for (const occ of allOccurrences) {
        if (!paidDatesBySchedule[occ.scheduleId]) paidDatesBySchedule[occ.scheduleId] = [];
        paidDatesBySchedule[occ.scheduleId].push(occ.dueDate);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const results: any[] = [];

      for (const schedule of schedules) {
        const rule: ScheduleRule = {
          repeatInterval: schedule.repeatInterval,
          repeatType: schedule.repeatType as ScheduleRule['repeatType'],
          startDate: schedule.startDate,
          endType: schedule.endType as ScheduleRule['endType'],
          endDate: schedule.endDate,
          endOccurrences: schedule.endOccurrences,
          specificDays: schedule.specificDays as string[] | null,
          weekendAdjustment: schedule.weekendAdjustment as ScheduleRule['weekendAdjustment'],
        };

        const paidDates = paidDatesBySchedule[schedule.id] || [];

        const notifyDays = schedule.notifyBefore;
        let notifyTypeMultiplier = 1;
        if (schedule.notifyType === 'weeks') notifyTypeMultiplier = 7;
        else if (schedule.notifyType === 'months') notifyTypeMultiplier = 30;
        const effectiveNotifyDays = notifyDays * notifyTypeMultiplier;

        const scheduleInfo = {
          id: schedule.id,
          name: schedule.name,
          accountId: schedule.accountId,
          accountName: schedule.accountName,
          payeeId: schedule.payeeId,
          payeeName: schedule.payeeName,
          transferAccountId: schedule.transferAccountId,
          transferAccountName: schedule.transferAccountName,
          amount: schedule.amount,
        };

        const allUnpaid = computeNextOccurrences(rule, paidDates, 100, { includePast: true });

        for (const occ of allUnpaid) {
          const dueDateTime = new Date(occ.dueDate + 'T00:00:00').getTime();
          const diffDays = Math.ceil((dueDateTime - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            results.push({
              schedule: scheduleInfo,
              occurrence: {
                dueDate: occ.dueDate,
                occurrenceIndex: occ.occurrenceIndex,
                daysUntilDue: diffDays,
                status: 'missed' as const,
              },
            });
          } else {
            if (diffDays > effectiveNotifyDays) continue;
            const status = computeScheduleStatus(occ.dueDate);
            results.push({
              schedule: scheduleInfo,
              occurrence: {
                dueDate: occ.dueDate,
                occurrenceIndex: occ.occurrenceIndex,
                daysUntilDue: diffDays,
                status,
              },
            });
            break;
          }
        }
      }

      results.sort((a, b) => {
        const statusOrder: Record<string, number> = { missed: 0, overdue: 1, due_soon: 2, upcoming: 3 };
        const aOrder = statusOrder[a.occurrence.status] ?? 4;
        const bOrder = statusOrder[b.occurrence.status] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.occurrence.daysUntilDue - a.occurrence.daysUntilDue;
      });

      return reply.send(results);
    },
  );
}
