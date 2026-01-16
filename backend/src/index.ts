import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { calendarRoutes } from './routes/calendar';
import { clientRoutes } from './routes/clients';
import { carRoutes } from './routes/cars';
import { retentionRoutes } from './routes/retention';
import { messageRoutes } from './routes/messages';
import { dashboardRoutes } from './routes/dashboard';
import { templateRoutes } from './routes/templates';
import { authenticate } from './middleware/auth';
import { prisma } from './db/client';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev_jwt_secret";


async function buildServer() {
  const app = fastify({ logger: true });

  // Global error handler for consistent error responses
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error({
      error,
      url: request.url,
      method: request.method,
    }, 'Request error');

    // Handle JWT authentication errors
    if (error.statusCode === 401) {
      return reply.code(401).send({
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    // Handle validation errors
    if (error.validation) {
      return reply.code(400).send({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.validation,
      });
    }

    // Handle not found
    if (error.statusCode === 404) {
      return reply.code(404).send({
        message: error.message || 'Not found',
        code: 'NOT_FOUND',
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
    });
  });

  // CORS handling
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.header('Access-Control-Allow-Credentials', 'true');

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
    }
  });

  app.register(fastifyJwt, {
    secret: JWT_SECRET,
  });

  // Add authenticate decorator
  app.decorate('authenticate', authenticate);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  // Register routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(dashboardRoutes);
  await app.register(calendarRoutes);
  await app.register(clientRoutes);
  await app.register(carRoutes);
  await app.register(retentionRoutes);
  await app.register(messageRoutes);
  await app.register(templateRoutes);

  return app;
}

buildServer()
  .then((app) => {
    app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`Server listening at ${address}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
