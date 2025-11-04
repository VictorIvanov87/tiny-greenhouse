import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import 'dotenv/config';
import healthRoutes from './routes/health';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: process.env.CORS_ORIGIN ?? true });
  app.register(helmet);

  app.register(healthRoutes);

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);

  app
    .listen({ port, host: '0.0.0.0' })
    .catch((error) => {
      app.log.error(error);
      process.exit(1);
    });
}
