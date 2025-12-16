import { FastifyInstance } from 'fastify';
import { registerShopAndUser, verifyCredentials } from '../services/authService';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const { shopName, email, password, name } = request.body as {
      shopName: string;
      email: string;
      password: string;
      name?: string;
    };

    if (!shopName || !email || !password) {
      return reply.code(400).send({ message: 'Missing required fields' });
    }

    try {
      const { shop, user } = await registerShopAndUser({ shopName, email, password, name });
      const token = app.jwt.sign({ id: user.id, shopId: shop.id });
      return reply.code(201).send({ token, shop, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ message: 'Registration failed' });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required' });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, shopId: user.shopId });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  });
}
