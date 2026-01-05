import "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; garageId: string };
    user: { id: string; garageId: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
