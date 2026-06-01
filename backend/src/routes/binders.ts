import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { budgetBinders } from '../db/schema';

interface CreateBinderBody {
  name: string;
  password: string;
  description?: string;
  currency?: string;
}

interface LoginBody {
  name: string;
  password: string;
}

export async function binderRoutes(app: FastifyInstance) {
  app.get('/binders', async (_req, reply) => {
    const binders = await db
      .select({
        id: budgetBinders.id,
        name: budgetBinders.name,
        description: budgetBinders.description,
        currency: budgetBinders.currency,
      })
      .from(budgetBinders)
      .orderBy(budgetBinders.createdAt);
    return reply.send(binders);
  });

  app.post<{ Body: CreateBinderBody }>('/binders', async (req, reply) => {
    const { name, password, description, currency } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const [binder] = await db
      .insert(budgetBinders)
      .values({
        name,
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
    return reply.status(201).send(binder);
  });

  app.post<{ Body: LoginBody }>('/binders/login', async (req, reply) => {
    const { name, password } = req.body;
    const [binder] = await db
      .select()
      .from(budgetBinders)
      .where(eq(budgetBinders.name, name));
    if (!binder) {
      return reply.status(401).send({ error: 'Invalid name or password' });
    }
    const valid = await bcrypt.compare(password, binder.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid name or password' });
    }
    return reply.send({ id: binder.id, name: binder.name });
  });
}
