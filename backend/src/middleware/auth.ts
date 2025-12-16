import { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ message: "Unauthorized" });
  }
}
