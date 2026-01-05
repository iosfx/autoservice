import { FastifyInstance } from 'fastify';
import { MessagingService } from '../services/messagingService';
import { DispatcherService } from '../services/dispatcherService';
import { MessageType } from '@prisma/client';

export async function messageRoutes(app: FastifyInstance) {
  // Send a message
  app.post('/messages/send', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { clientId, type, content } = request.body as {
        clientId: string;
        type: MessageType;
        content: string;
      };

      if (!clientId || !type || !content) {
        return reply.code(400).send({
          message: 'Client ID, type, and content are required',
        });
      }

      if (!['SMS', 'WHATSAPP'].includes(type)) {
        return reply.code(400).send({
          message: 'Type must be SMS or WHATSAPP',
        });
      }

      const result = await MessagingService.sendMessage({
        clientId,
        type,
        content,
      });

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to send message',
      });
    }
  });

  // Get message history for a client
  app.get('/messages/client/:clientId', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { clientId } = request.params as { clientId: string };

      const messages = await MessagingService.getClientMessages(clientId);

      return { messages };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get messages',
      });
    }
  });

  // Get recent messages for garage
  app.get('/messages', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { limit } = request.query as { limit?: string };

      const messages = await MessagingService.getGarageMessages(
        garageId,
        limit ? parseInt(limit) : 50
      );

      return { messages };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get messages',
      });
    }
  });

  // Dispatch due messages from the queue
  app.post('/messages/dispatch', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { limit } = request.body as { limit?: number };

      const result = await DispatcherService.dispatchDueMessages(
        garageId,
        limit || 100
      );

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to dispatch messages',
      });
    }
  });
}
