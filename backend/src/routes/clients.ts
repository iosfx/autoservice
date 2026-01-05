import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client';

export async function clientRoutes(app: FastifyInstance) {
  // Get all clients for a garage
  app.get('/clients', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };

      const clients = await prisma.client.findMany({
        where: { garageId },
        include: {
          cars: true,
          _count: {
            select: {
              serviceVisits: true,
              messageLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { clients };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get clients',
      });
    }
  });

  // Get a single client by ID
  app.get('/clients/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };

      const client = await prisma.client.findFirst({
        where: {
          id,
          garageId,
        },
        include: {
          cars: true,
          serviceVisits: {
            orderBy: { serviceDate: 'desc' },
            take: 10,
          },
          messageLogs: {
            orderBy: { sentAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!client) {
        return reply.code(404).send({ message: 'Client not found' });
      }

      return { client };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get client',
      });
    }
  });

  // Create a new client
  app.post('/clients', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { name, phone, birthday } = request.body as {
        name: string;
        phone: string;
        birthday?: string;
      };

      if (!name || !phone) {
        return reply.code(400).send({
          message: 'Name and phone are required',
        });
      }

      const client = await prisma.client.create({
        data: {
          garageId,
          name,
          phone,
          birthday: birthday ? new Date(birthday) : undefined,
        },
      });

      return reply.code(201).send({ client });
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to create client',
      });
    }
  });

  // Update a client
  app.put('/clients/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };
      const { name, phone, birthday } = request.body as {
        name?: string;
        phone?: string;
        birthday?: string;
      };

      // Verify client belongs to garage
      const existingClient = await prisma.client.findFirst({
        where: { id, garageId },
      });

      if (!existingClient) {
        return reply.code(404).send({ message: 'Client not found' });
      }

      const client = await prisma.client.update({
        where: { id },
        data: {
          name,
          phone,
          birthday: birthday ? new Date(birthday) : undefined,
        },
      });

      return { client };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to update client',
      });
    }
  });

  // Delete a client
  app.delete('/clients/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };

      // Verify client belongs to garage
      const existingClient = await prisma.client.findFirst({
        where: { id, garageId },
      });

      if (!existingClient) {
        return reply.code(404).send({ message: 'Client not found' });
      }

      await prisma.client.delete({
        where: { id },
      });

      return { success: true, message: 'Client deleted' };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to delete client',
      });
    }
  });
}
