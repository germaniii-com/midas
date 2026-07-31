import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';

export interface Category {
  id: string;
  binderId: string;
  name: string;
  createdAt: string;
}

export async function listCategories(binderId: string): Promise<Category[]> {
  return db.select().from(categories).where(eq(categories.binderId, binderId)).orderBy(categories.name);
}

export async function getCategory(binderId: string, categoryId: string): Promise<Category | null> {
  const [category] = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.binderId, binderId)));
  return category ?? null;
}

export async function createCategory(binderId: string, input: { name: string }): Promise<Category> {
  if (!input.name?.trim()) throw new Error('Name is required');

  const [existing] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.binderId, binderId), sql`LOWER(${categories.name}) = LOWER(${input.name.trim()})`)).limit(1);
  if (existing) throw new Error('A category with this name already exists in this binder');

  const [category] = await db.insert(categories).values({ binderId, name: input.name.trim() }).returning();
  return category;
}

export async function updateCategory(binderId: string, categoryId: string, input: { name?: string }): Promise<Category> {
  if (input.name !== undefined && !input.name.trim()) throw new Error('Name cannot be empty');

  const updates: Partial<typeof categories.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name.trim();

  const [category] = await db.update(categories).set(updates).where(eq(categories.id, categoryId)).returning();
  if (!category) throw new Error('Category not found');
  return category;
}

export async function deleteCategory(binderId: string, categoryId: string): Promise<void> {
  const [category] = await db.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.binderId, binderId))).returning({ id: categories.id });
  if (!category) throw new Error('Category not found');
}
