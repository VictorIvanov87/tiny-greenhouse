import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ensureFirebase } from '../lib/firebase';
import { errorBody } from '../lib/respond';

const VALID_AUTH_MODES = ['mock', 'firebase'] as const;
type AuthMode = (typeof VALID_AUTH_MODES)[number];

function resolveAuthMode(): AuthMode {
  const raw = process.env.AUTH_MODE?.toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!raw) {
    if (isProduction) {
      throw new Error(
        'AUTH_MODE is not set. Production requires AUTH_MODE=firebase. ' +
          'Set AUTH_MODE=mock only for local development.',
      );
    }
    return 'mock';
  }

  if (!VALID_AUTH_MODES.includes(raw as AuthMode)) {
    throw new Error(
      `AUTH_MODE="${raw}" is not a valid auth mode. Allowed values: ${VALID_AUTH_MODES.join(', ')}.`,
    );
  }

  if (raw === 'mock' && isProduction) {
    throw new Error('AUTH_MODE=mock is not allowed in production. Set AUTH_MODE=firebase.');
  }

  return raw as AuthMode;
}

const authPlugin: FastifyPluginAsync = async (app) => {
  const mode = resolveAuthMode();

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
