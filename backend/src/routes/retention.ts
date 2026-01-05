import { FastifyInstance } from 'fastify';
import { RetentionService } from '../services/retentionService';
import { DispatcherService } from '../services/dispatcherService';
import { RetentionRuleType, QueueStatus } from '@prisma/client';
import { prisma } from '../db/client';

export async function retentionRoutes(app: FastifyInstance) {
  // Get retention alerts
  app.get('/retention/alerts', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };

      const alerts = await RetentionService.getRetentionAlerts(garageId);

      return { alerts, count: alerts.length };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get retention alerts',
      });
    }
  });

  // Get retention rules
  app.get('/retention/rules', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };

      const rules = await RetentionService.getRules(garageId);

      return { rules };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get retention rules',
      });
    }
  });

  // Create retention rule
  app.post('/retention/rules', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { type, threshold, messageTemplate } = request.body as {
        type: RetentionRuleType;
        threshold: number;
        messageTemplate: string;
      };

      if (!type || !threshold || !messageTemplate) {
        return reply.code(400).send({
          message: 'Type, threshold, and message template are required',
        });
      }

      if (!['MILEAGE', 'TIME'].includes(type)) {
        return reply.code(400).send({
          message: 'Type must be MILEAGE or TIME',
        });
      }

      if (threshold <= 0) {
        return reply.code(400).send({
          message: 'Threshold must be greater than 0',
        });
      }

      const rule = await RetentionService.createRule({
        garageId,
        type,
        threshold,
        messageTemplate,
      });

      return reply.code(201).send({ rule });
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to create retention rule',
      });
    }
  });

  // Update retention rule
  app.put('/retention/rules/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { threshold, messageTemplate, isActive } = request.body as {
        threshold?: number;
        messageTemplate?: string;
        isActive?: boolean;
      };

      const rule = await RetentionService.updateRule(id, {
        threshold,
        messageTemplate,
        isActive,
      });

      return { rule };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to update retention rule',
      });
    }
  });

  // Delete retention rule
  app.delete('/retention/rules/:id', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await RetentionService.deleteRule(id);

      return { success: true, message: 'Rule deleted' };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to delete retention rule',
      });
    }
  });

  // Process retention alerts (trigger sending messages)
  // @deprecated Use /retention/run instead
  app.post('/retention/process', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };

      const result = await RetentionService.processRetentionAlerts(garageId);

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to process retention alerts',
      });
    }
  });

  // Run retention generation (create MessageQueue items)
  app.post('/retention/run', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { lookaheadDays } = request.body as { lookaheadDays?: number };

      const result = await RetentionService.runRetentionGeneration(
        garageId,
        lookaheadDays || parseInt(process.env.RETENTION_LOOKAHEAD_DAYS || '14')
      );

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to run retention generation',
      });
    }
  });

  // Get message queue with filters
  app.get('/retention/queue', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { status, startDate, endDate, limit } = request.query as {
        status?: QueueStatus;
        startDate?: string;
        endDate?: string;
        limit?: string;
      };

      const where: any = { garageId };

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.scheduledFor = {};
        if (startDate) {
          where.scheduledFor.gte = new Date(startDate);
        }
        if (endDate) {
          where.scheduledFor.lte = new Date(endDate);
        }
      }

      const queue = await prisma.messageQueue.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          car: {
            select: {
              id: true,
              licensePlate: true,
            },
          },
        },
        orderBy: {
          scheduledFor: 'asc',
        },
        take: limit ? parseInt(limit) : 100,
      });

      return { queue, count: queue.length };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to get message queue',
      });
    }
  });

  // Send a specific queue item now
  app.post('/retention/queue/:id/send-now', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };

      // Verify ownership
      const queueItem = await prisma.messageQueue.findFirst({
        where: { id, garageId },
      });

      if (!queueItem) {
        return reply.code(404).send({ message: 'Queue item not found' });
      }

      const result = await DispatcherService.dispatchMessage(id);

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to send message',
      });
    }
  });

  // Cancel a scheduled message
  app.post('/retention/queue/:id/cancel', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };

      const result = await DispatcherService.cancelMessage(id, garageId);

      return { success: true, queueItem: result };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to cancel message',
      });
    }
  });

  // Reschedule a message
  app.post('/retention/queue/:id/reschedule', {
    onRequest: [app.authenticate],
  }, async (request, reply) => {
    try {
      const { garageId } = request.user as { garageId: string };
      const { id } = request.params as { id: string };
      const { scheduledFor } = request.body as { scheduledFor: string };

      if (!scheduledFor) {
        return reply.code(400).send({
          message: 'scheduledFor is required',
        });
      }

      const result = await DispatcherService.rescheduleMessage(
        id,
        garageId,
        new Date(scheduledFor)
      );

      return { success: true, queueItem: result };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        message: error.message || 'Failed to reschedule message',
      });
    }
  });
}
