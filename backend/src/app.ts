import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import 'dotenv/config';
import { startIotConsumer, stopIotConsumer } from './iot/consumer';
import authPlugin from './plugins/auth';
import healthRoutes from './routes/health';
import telemetryRoutes from './routes/telemetry';
import timelapseRoutes from './routes/timelapse';
import notificationsRoutes from './routes/notifications';
import greenhouseRoutes from './routes/greenhouse';
import alertsRoutes from './routes/alerts';
import ragRoutes from './routes/rag';
import assistRoutes from './routes/assist';
import cropsRoutes from './routes/crops';
import cameraRoutes from './routes/camera';
import devicesRoutes from './routes/devices';
import controlSettingsRoutes from './routes/controlSettings';

export function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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
  app.register(cropsRoutes);
  app.register(cameraRoutes);
  app.register(devicesRoutes);
  app.register(controlSettingsRoutes);
  app.register(ragRoutes);
  app.register(assistRoutes);

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);

  if (process.env.RAG_DEBUG === 'true') {
    app.log.warn('RAG debug endpoint is ENABLED — /api/rag/search is accessible');
  }

  app
    .listen({ port, host: '0.0.0.0' })
    .then(async () => {
      if (process.env.IOT_HUB_ENABLED === 'true') {
        try {
          await startIotConsumer(app.log);
        } catch (err) {
          app.log.error(err, 'Failed to start IoT Hub consumer');
        }
      }
    })
    .catch((error) => {
      app.log.error(error);
      process.exit(1);
    });

  // Graceful shutdown: close HTTP server + IoT Hub consumer
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down...`);
    await stopIotConsumer(app.log);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
