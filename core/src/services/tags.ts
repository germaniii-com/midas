import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tags } from '../db/schema.js';

export interface Tag {
  id: string;
  binderId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export async function listTags(binderId: string): Promise<Tag[]> {
  return db.select().from(tags).where(eq(tags.binderId, binderId)).orderBy(tags.name);
}

export async function getTag(binderId: string, tagId: string): Promise<Tag | null> {
  const [tag] = await db.select().from(tags).where(and(eq(tags.id, tagId), eq(tags.binderId, binderId)));
  return tag ?? null;
}

export async function createTag(binderId: string, input: { name: string; color?: string }): Promise<Tag> {
  if (!input.name?.trim()) throw new Error('Name is required');

  const [existing] = await db.select({ id: tags.id }).from(tags).where(and(eq(tags.binderId, binderId), sql`LOWER(${tags.name}) = LOWER(${input.name.trim()})`)).limit(1);
  if (existing) throw new Error('A tag with this name already exists in this binder');

  const [tag] = await db.insert(tags).values({ binderId, name: input.name.trim(), color: input.color ?? '#3B82F6' }).returning();
  return tag;
}

export async function updateTag(binderId: string, tagId: string, input: { name?: string; color?: string }): Promise<Tag> {
  if (input.name !== undefined && !input.name.trim()) throw new Error('Name cannot be empty');

  const updates: Partial<typeof tags.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.color !== undefined) updates.color = input.color;

  const [tag] = await db.update(tags).set(updates).where(eq(tags.id, tagId)).returning();
  if (!tag) throw new Error('Tag not found');
  return tag;
}

export async function deleteTag(binderId: string, tagId: string): Promise<void> {
  const [tag] = await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.binderId, binderId))).returning({ id: tags.id });
  if (!tag) throw new Error('Tag not found');
}
