import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import 'dotenv/config';
import authPlugin from './plugins/auth';
import healthRoutes from './routes/health';
import telemetryRoutes from './routes/telemetry';
import timelapseRoutes from './routes/timelapse';
import notificationsRoutes from './routes/notifications';
import greenhouseRoutes from './routes/greenhouse';
import alertsRoutes from './routes/alerts';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.register(helmet);

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Tiny Greenhouse API',
        description: 'Mock API for Tiny Greenhouse frontend development.',
        version: '0.1.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
  });

  app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });

  app.register(authPlugin);

  app.register(healthRoutes);
  app.register(telemetryRoutes);
  app.register(timelapseRoutes);
  app.register(notificationsRoutes);
  app.register(alertsRoutes);
  app.register(greenhouseRoutes);

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
