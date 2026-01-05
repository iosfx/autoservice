import { prisma } from '../db/client';
import { QueueStatus, MessageChannel } from '@prisma/client';
import { getMessagingProvider } from './messaging';
import { TemplateService } from './templateService';

export class DispatcherService {
  /**
   * Dispatch due messages for a garage
   * @param garageId The garage ID
   * @param limit Maximum number of messages to dispatch (default: 100)
   */
  static async dispatchDueMessages(garageId: string, limit: number = 100) {
    const now = new Date();

    // Get due messages (SCHEDULED or DUE status, scheduledFor <= now, not canceled)
    const dueMessages = await prisma.messageQueue.findMany({
      where: {
        garageId,
        status: {
          in: ['SCHEDULED', 'DUE'],
        },
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        client: true,
        car: true,
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: limit,
    });

    const results = {
      total: dueMessages.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const message of dueMessages) {
      try {
        await this.dispatchMessage(message.id);
        results.sent++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Message ${message.id}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Dispatch a single message by ID
   */
  static async dispatchMessage(messageQueueId: string) {
    const message = await prisma.messageQueue.findUnique({
      where: { id: messageQueueId },
      include: {
        client: true,
        car: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status === 'SENT') {
      throw new Error('Message already sent');
    }

    if (message.status === 'CANCELED') {
      throw new Error('Message was canceled');
    }

    if (message.status === 'BLOCKED') {
      throw new Error(`Message is blocked: ${message.blockedReason}`);
    }

    // Update status to SENDING
    await prisma.messageQueue.update({
      where: { id: messageQueueId },
      data: { status: 'SENDING' },
    });

    try {
      // Get content - render on-demand if missing
      let content = message.renderedPreview;

      if (!content) {
        // On-demand rendering: load template and render with stored variables
        const template = await TemplateService.getTemplateByTypeAndChannel(
          message.garageId,
          message.triggerType,
          message.channel
        );

        if (!template || !template.enabled) {
          // Cannot render - mark as FAILED
          await prisma.messageQueue.update({
            where: { id: messageQueueId },
            data: {
              status: 'FAILED',
              lastError: template
                ? 'Template is disabled'
                : 'Template not found for this trigger type and channel',
            },
          });

          throw new Error(
            template
              ? 'Template is disabled'
              : 'Template not found for this trigger type and channel'
          );
        }

        // Parse stored variables and render
        const variables = JSON.parse(message.variablesJson || '{}');
        const { rendered } = TemplateService.renderTemplate(template.body, variables);
        content = rendered;
      }

      // Send via messaging provider
      const provider = getMessagingProvider();
      const result = await provider.sendMessage(
        message.client.phone,
        content,
        message.channel
      );

      if (result.success) {
        // Success - update queue status and create log
        await prisma.$transaction([
          prisma.messageQueue.update({
            where: { id: messageQueueId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              lastError: null,
            },
          }),
          prisma.messageLog.create({
            data: {
              clientId: message.clientId,
              messageQueueId: message.id,
              type: message.channel === 'SMS' ? 'SMS' : 'WHATSAPP',
              content,
              status: 'SENT',
            },
          }),
        ]);

        return { success: true, messageQueueId };
      } else {
        // Failure - handle retry logic
        const newRetryCount = message.retryCount + 1;
        const shouldRetry = newRetryCount < message.maxRetries;

        if (shouldRetry) {
          // Calculate backoff: 15m, 1h, 6h
          const backoffMinutes = [15, 60, 360][newRetryCount - 1] || 360;
          const newScheduledFor = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await prisma.$transaction([
            prisma.messageQueue.update({
              where: { id: messageQueueId },
              data: {
                status: 'SCHEDULED',
                retryCount: newRetryCount,
                lastError: result.error || 'Unknown error',
                scheduledFor: newScheduledFor,
              },
            }),
            prisma.messageLog.create({
              data: {
                clientId: message.clientId,
                messageQueueId: message.id,
                type: message.channel === 'SMS' ? 'SMS' : 'WHATSAPP',
                content,
                status: 'FAILED',
                errorMessage: result.error,
              },
            }),
          ]);

          return {
            success: false,
            retry: true,
            retryAt: newScheduledFor,
            error: result.error,
          };
        } else {
          // Max retries reached - mark as FAILED
          await prisma.$transaction([
            prisma.messageQueue.update({
              where: { id: messageQueueId },
              data: {
                status: 'FAILED',
                retryCount: newRetryCount,
                lastError: result.error || 'Max retries reached',
              },
            }),
            prisma.messageLog.create({
              data: {
                clientId: message.clientId,
                messageQueueId: message.id,
                type: message.channel === 'SMS' ? 'SMS' : 'WHATSAPP',
                content,
                status: 'FAILED',
                errorMessage: result.error || 'Max retries reached',
              },
            }),
          ]);

          return {
            success: false,
            retry: false,
            error: result.error || 'Max retries reached',
          };
        }
      }
    } catch (error: any) {
      // Unexpected error - mark as FAILED
      await prisma.messageQueue.update({
        where: { id: messageQueueId },
        data: {
          status: 'FAILED',
          lastError: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Cancel a scheduled message
   */
  static async cancelMessage(messageQueueId: string, garageId: string) {
    const message = await prisma.messageQueue.findFirst({
      where: {
        id: messageQueueId,
        garageId,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status === 'SENT') {
      throw new Error('Cannot cancel a message that has already been sent');
    }

    if (message.status === 'SENDING') {
      throw new Error('Cannot cancel a message that is currently being sent');
    }

    return prisma.messageQueue.update({
      where: { id: messageQueueId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }

  /**
   * Reschedule a message
   */
  static async rescheduleMessage(
    messageQueueId: string,
    garageId: string,
    scheduledFor: Date
  ) {
    const message = await prisma.messageQueue.findFirst({
      where: {
        id: messageQueueId,
        garageId,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status === 'SENT') {
      throw new Error('Cannot reschedule a message that has already been sent');
    }

    if (message.status === 'CANCELED') {
      throw new Error('Cannot reschedule a canceled message');
    }

    return prisma.messageQueue.update({
      where: { id: messageQueueId },
      data: {
        scheduledFor,
        status: 'SCHEDULED',
      },
    });
  }

  /**
   * Get queue statistics for a garage
   */
  static async getQueueStats(garageId: string) {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      dueCount,
      scheduledCount,
      failedCount,
      blockedCount,
      sentLast24h,
      nextScheduled,
    ] = await Promise.all([
      prisma.messageQueue.count({
        where: {
          garageId,
          status: 'DUE',
        },
      }),
      prisma.messageQueue.count({
        where: {
          garageId,
          status: 'SCHEDULED',
        },
      }),
      prisma.messageQueue.count({
        where: {
          garageId,
          status: 'FAILED',
        },
      }),
      prisma.messageQueue.count({
        where: {
          garageId,
          status: 'BLOCKED',
        },
      }),
      prisma.messageQueue.count({
        where: {
          garageId,
          status: 'SENT',
          sentAt: {
            gte: last24h,
          },
        },
      }),
      prisma.messageQueue.findMany({
        where: {
          garageId,
          status: {
            in: ['SCHEDULED', 'DUE'],
          },
        },
        include: {
          client: true,
          car: true,
        },
        orderBy: {
          scheduledFor: 'asc',
        },
        take: 10,
      }),
    ]);

    return {
      dueCount,
      scheduledCount,
      failedCount,
      blockedCount,
      sentLast24hCount: sentLast24h,
      nextScheduled,
    };
  }
}
