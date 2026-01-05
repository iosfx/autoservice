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
import { authenticate } from './middleware/auth';
import { prisma } from './db/client';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev_jwt_secret";


async function buildServer() {
  const app = fastify({ logger: true });

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
