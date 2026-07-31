import bcrypt from 'bcrypt';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { budgetBinders } from '../db/schema.js';

export interface Binder {
  id: string;
  name: string;
  description: string | null;
  currency: string;
}

export interface CreateBinderInput {
  name: string;
  password: string;
  description?: string;
  currency?: string;
}

export interface UpdateBinderInput {
  name?: string;
  currency?: string;
}

export async function listBinders(): Promise<Binder[]> {
  return db
    .select({
      id: budgetBinders.id,
      name: budgetBinders.name,
      description: budgetBinders.description,
      currency: budgetBinders.currency,
    })
    .from(budgetBinders)
    .orderBy(budgetBinders.createdAt);
}

export async function getBinder(id: string): Promise<Binder | null> {
  const [binder] = await db
    .select({
      id: budgetBinders.id,
      name: budgetBinders.name,
      description: budgetBinders.description,
      currency: budgetBinders.currency,
    })
    .from(budgetBinders)
    .where(eq(budgetBinders.id, id));
  return binder ?? null;
}

export async function createBinder(input: CreateBinderInput): Promise<Binder> {
  const { name, password, description, currency } = input;

  const [existing] = await db
    .select({ id: budgetBinders.id })
    .from(budgetBinders)
    .where(sql`LOWER(${budgetBinders.name}) = LOWER(${name.trim()})`)
    .limit(1);

  if (existing) {
    throw new Error('A binder with this name already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [binder] = await db
    .insert(budgetBinders)
    .values({
      name: name.trim(),
      passwordHash,
      description: description ?? null,
      currency: currency ?? 'USD',
    })
    .returning({
      id: budgetBinders.id,
      name: budgetBinders.name,
      description: budgetBinders.description,
      currency: budgetBinders.currency,
    });

  return binder;
}

export async function updateBinder(id: string, input: UpdateBinderInput): Promise<Binder> {
  const updates: Partial<typeof budgetBinders.$inferInsert> = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error('Name cannot be empty');
    }
    const [existing] = await db
      .select({ id: budgetBinders.id })
      .from(budgetBinders)
      .where(
        and(
          sql`LOWER(${budgetBinders.name}) = LOWER(${input.name.trim()})`,
          sql`${budgetBinders.id} != ${id}`,
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error('A binder with this name already exists');
    }
    updates.name = input.name.trim();
  }

  if (input.currency !== undefined) {
    updates.currency = input.currency;
  }

  const [binder] = await db
    .update(budgetBinders)
    .set(updates)
    .where(eq(budgetBinders.id, id))
    .returning({
      id: budgetBinders.id,
      name: budgetBinders.name,
      description: budgetBinders.description,
      currency: budgetBinders.currency,
    });

  if (!binder) {
    throw new Error('Binder not found');
  }

  return binder;
}

export async function loginBinder(name: string, password: string): Promise<{ id: string; name: string }> {
  const [binder] = await db
    .select()
    .from(budgetBinders)
    .where(eq(budgetBinders.name, name));

  if (!binder) {
    throw new Error('Invalid name or password');
  }

  const valid = await bcrypt.compare(password, binder.passwordHash);
  if (!valid) {
    throw new Error('Invalid name or password');
  }

  return { id: binder.id, name: binder.name };
}
