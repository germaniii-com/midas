import { FastifyInstance } from 'fastify';
import { listRemoteBinders, pullRemoteBinder } from '@midas/core';

export async function remoteRoutes(app: FastifyInstance) {
  app.post('/remote/list-binders', async (req, reply) => {
    const { host, password } = req.body as { host: string; password: string };

    if (!host || !password) {
      return reply.status(400).send({ error: 'Host and server password are required' });
    }

    try {
      const binders = await listRemoteBinders(host, password);
      return reply.send({ binders });
    } catch (err) {
      if (err instanceof Error && err.message.includes('password')) {
        return reply.status(401).send({ error: err.message });
      }
      if (err instanceof Error && err.name === 'TimeoutError') {
        return reply.status(502).send({ error: 'Connection to remote server timed out' });
      }
      return reply
        .status(502)
        .send({
          error:
            'Could not connect to remote server. Check the host and ensure the server is running.',
        });
    }
  });

  app.post('/remote/pull-binder', async (req, reply) => {
    const { host, serverPassword, binderId, binderName, password } = req.body as {
      host: string;
      serverPassword: string;
      binderId: string;
      binderName: string;
      password: string;
    };

    if (!host || !serverPassword || !binderId || !binderName || !password) {
      return reply.status(400).send({ error: 'All fields are required' });
    }

    try {
      const result = await pullRemoteBinder(host, serverPassword, binderId, binderName, password);
      return reply.status(201).send(result);
    } catch (err) {
      if (!(err instanceof Error)) {
        return reply.status(400).send({ error: 'Failed to pull binder' });
      }
      if (err.name === 'TimeoutError') {
        return reply.status(502).send({ error: 'Connection to remote server timed out' });
      }
      if (err.message.includes('password') || err.message.includes('mismatch')) {
        return reply.status(401).send({ error: err.message });
      }
      if (err.message.includes('export')) {
        return reply.status(502).send({ error: err.message });
      }
      return reply.status(400).send({ error: err.message });
    }
  });
}
