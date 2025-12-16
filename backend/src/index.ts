import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { jobRoutes } from './routes/jobs';
import { prisma } from './db/client';

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

async function buildServer() {
  const app = fastify({ logger: true });

  app.register(fastifyJwt, {
    secret: JWT_SECRET,
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(jobRoutes);

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
