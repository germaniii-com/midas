import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { payees } from '../db/schema.js';

export type Payee = typeof payees.$inferSelect;

export async function listPayees(binderId: string): Promise<Payee[]> {
  return db.select().from(payees).where(eq(payees.binderId, binderId)).orderBy(payees.name);
}

export async function getPayee(binderId: string, payeeId: string): Promise<Payee | null> {
  const [payee] = await db
    .select()
    .from(payees)
    .where(and(eq(payees.id, payeeId), eq(payees.binderId, binderId)));
  return payee ?? null;
}

export async function createPayee(binderId: string, input: { name: string }): Promise<Payee> {
  if (!input.name?.trim()) throw new Error('Name is required');

  const [existing] = await db
    .select({ id: payees.id })
    .from(payees)
    .where(
      and(eq(payees.binderId, binderId), sql`LOWER(${payees.name}) = LOWER(${input.name.trim()})`),
    )
    .limit(1);
  if (existing) throw new Error('A payee with this name already exists in this binder');

  const [payee] = await db.insert(payees).values({ binderId, name: input.name.trim() }).returning();
  return payee;
}

export async function updatePayee(
  binderId: string,
  payeeId: string,
  input: { name?: string },
): Promise<Payee> {
  if (input.name !== undefined && !input.name.trim()) throw new Error('Name cannot be empty');

  const updates: Partial<typeof payees.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name.trim();

  const [payee] = await db.update(payees).set(updates).where(eq(payees.id, payeeId)).returning();
  if (!payee) throw new Error('Payee not found');
  return payee;
}

export async function deletePayee(binderId: string, payeeId: string): Promise<void> {
  const [payee] = await db
    .delete(payees)
    .where(and(eq(payees.id, payeeId), eq(payees.binderId, binderId)))
    .returning({ id: payees.id });
  if (!payee) throw new Error('Payee not found');
}
