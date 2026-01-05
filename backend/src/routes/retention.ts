import { FastifyInstance } from 'fastify';
import { RetentionService } from '../services/retentionService';
import { RetentionRuleType } from '@prisma/client';

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
}
