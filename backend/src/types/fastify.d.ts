import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { uid: string; email?: string };
  }

  interface FastifyInstance {
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
