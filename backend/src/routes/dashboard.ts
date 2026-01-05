import { FastifyInstance } from 'fastify';
import { DispatcherService } from '../services/dispatcherService';
import { RetentionService } from '../services/retentionService';
import { prisma } from '../db/client';

export async function dashboardRoutes(app: FastifyInstance) {
  /**
   * Get dashboard retention summary
   * Returns counts and next scheduled messages
   */
  app.get(
    '/dashboard/retention-summary',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };

        // Get queue stats
        const queueStats = await DispatcherService.getQueueStats(garageId);

        // Get last calendar sync time
        const garage = await prisma.garage.findUnique({
          where: { id: garageId },
          select: { lastSyncAt: true },
        });

        // Get active retention rules count
        const activeRulesCount = await prisma.retentionRule.count({
          where: {
            garageId,
            isActive: true,
          },
        });

        return {
          dueCount: queueStats.dueCount,
          scheduledCount: queueStats.scheduledCount,
          failedCount: queueStats.failedCount,
          blockedCount: queueStats.blockedCount,
          sentLast24hCount: queueStats.sentLast24hCount,
          lastCalendarSyncAt: garage?.lastSyncAt || null,
          activeRulesCount,
          nextScheduled: queueStats.nextScheduled.map((item) => ({
            id: item.id,
            clientName: item.client.name,
            clientPhone: item.client.phone,
            carLicensePlate: item.car?.licensePlate || null,
            scheduledFor: item.scheduledFor,
            triggerType: item.triggerType,
            preview: item.renderedPreview?.substring(0, 100) || '',
            status: item.status,
          })),
        };
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to get dashboard summary',
        });
      }
    }
  );

  /**
   * Get retention alerts (legacy - now shows queue status)
   */
  app.get(
    '/dashboard/retention-alerts',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };

        // Return the queue items that are due or scheduled
        const alerts = await prisma.messageQueue.findMany({
          where: {
            garageId,
            status: {
              in: ['DUE', 'SCHEDULED'],
            },
          },
          include: {
            client: true,
            car: true,
          },
          orderBy: {
            scheduledFor: 'asc',
          },
          take: 50,
        });

        return {
          alerts: alerts.map((item) => ({
            id: item.id,
            clientName: item.client.name,
            clientPhone: item.client.phone,
            carLicensePlate: item.car?.licensePlate || null,
            triggerType: item.triggerType,
            scheduledFor: item.scheduledFor,
            preview: item.renderedPreview,
            status: item.status,
          })),
          count: alerts.length,
        };
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to get retention alerts',
        });
      }
    }
  );
}
