import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ensureFirebase } from '../lib/firebase';
import { errorBody } from '../lib/respond';

const authPlugin: FastifyPluginAsync = async (app) => {
  const mode = (process.env.AUTH_MODE ?? 'mock').toLowerCase();

  async function mockAuth(req: FastifyRequest) {
    const headerUid = req.headers['x-user-id'];
    const uid = typeof headerUid === 'string' && headerUid.trim() ? headerUid.trim() : 'demo';
    const emailHeader = req.headers['x-user-email'];
    const email =
      typeof emailHeader === 'string' && emailHeader.trim() ? emailHeader.trim() : undefined;

    req.user = { uid, email };
  }

  async function firebaseAuth(req: FastifyRequest, reply: FastifyReply) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401);
      throw errorBody('unauthorized', 'Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();

    if (!token) {
      reply.code(401);
      throw errorBody('unauthorized', 'Missing bearer token');
    }

    const { auth } = ensureFirebase();
    const decoded = await auth.verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
    };
  }

  app.decorate(
    'auth',
    async (req, reply) => {
      try {
        if (mode === 'firebase') {
          await firebaseAuth(req, reply);
        } else {
          await mockAuth(req);
        }
      } catch (error) {
        if (reply.statusCode < 400) {
          reply.code(401);
        }
        throw errorBody('unauthorized', error instanceof Error ? error.message : 'Unauthorized');
      }
    },
  );
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});
