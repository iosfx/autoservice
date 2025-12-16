import { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; shopId: string };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as { id: string; shopId: string };
    request.user = payload;
  } catch (error) {
    reply.code(401).send({ message: 'Unauthorized' });
  }
}
