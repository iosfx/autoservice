import { prisma } from '../db/client';
import { RetentionRuleType, TriggerType, MessageChannel } from '@prisma/client';

export class RetentionService {
  /**
   * Create a new retention rule
   */
  static async createRule(data: {
    garageId: string;
    type: RetentionRuleType;
    threshold: number;
    messageTemplate: string;
  }) {
    return prisma.retentionRule.create({
      data,
    });
  }

  /**
   * Get all retention rules for a garage
   */
  static async getRules(garageId: string) {
    return prisma.retentionRule.findMany({
      where: { garageId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a retention rule
   */
  static async updateRule(id: string, data: {
    threshold?: number;
    messageTemplate?: string;
    isActive?: boolean;
  }) {
    return prisma.retentionRule.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a retention rule
   */
  static async deleteRule(id: string) {
    return prisma.retentionRule.delete({
      where: { id },
    });
  }

  /**
   * Get retention alerts for a garage
   * This checks which clients/cars are due for service based on retention rules
   */
  static async getRetentionAlerts(garageId: string) {
    const rules = await this.getRules(garageId);
    const alerts: any[] = [];

    for (const rule of rules) {
      if (rule.type === 'TIME') {
        const timeAlerts = await this.getTimeBasedAlerts(garageId, rule);
        alerts.push(...timeAlerts);
      } else if (rule.type === 'MILEAGE') {
        const mileageAlerts = await this.getMileageBasedAlerts(garageId, rule);
        alerts.push(...mileageAlerts);
      }
    }

    return alerts;
  }

  /**
   * Get time-based retention alerts
   * Finds cars that haven't had service in X days
   */
  private static async getTimeBasedAlerts(garageId: string, rule: any) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - rule.threshold);

    const cars = await prisma.car.findMany({
      where: {
        client: { garageId },
        OR: [
          { lastServiceDate: { lte: thresholdDate } },
          { lastServiceDate: null },
        ],
      },
      include: {
        client: true,
        serviceVisits: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    return cars.map((car) => ({
      ruleId: rule.id,
      ruleType: 'TIME',
      clientId: car.client.id,
      clientName: car.client.name,
      clientPhone: car.client.phone,
      carId: car.id,
      licensePlate: car.licensePlate,
      lastServiceDate: car.lastServiceDate,
      daysSinceService: car.lastServiceDate
        ? Math.floor((Date.now() - car.lastServiceDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      messageTemplate: rule.messageTemplate,
      message: this.interpolateMessage(rule.messageTemplate, {
        clientName: car.client.name,
        licensePlate: car.licensePlate,
        daysSinceService: car.lastServiceDate
          ? Math.floor((Date.now() - car.lastServiceDate.getTime()) / (1000 * 60 * 60 * 24))
          : 'unknown',
      }),
    }));
  }

  /**
   * Get mileage-based retention alerts
   * Finds cars that are due based on mileage since last service
   */
  private static async getMileageBasedAlerts(garageId: string, rule: any) {
    const cars = await prisma.car.findMany({
      where: {
        client: { garageId },
        currentMileage: { gt: 0 },
      },
      include: {
        client: true,
        serviceVisits: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    const alerts = [];

    for (const car of cars) {
      const lastVisit = car.serviceVisits[0];
      const mileageAtLastVisit = lastVisit?.mileageAtVisit || 0;
      const mileageSinceService = car.currentMileage - mileageAtLastVisit;

      if (mileageSinceService >= rule.threshold) {
        alerts.push({
          ruleId: rule.id,
          ruleType: 'MILEAGE',
          clientId: car.client.id,
          clientName: car.client.name,
          clientPhone: car.client.phone,
          carId: car.id,
          licensePlate: car.licensePlate,
          currentMileage: car.currentMileage,
          mileageAtLastVisit,
          mileageSinceService,
          messageTemplate: rule.messageTemplate,
          message: this.interpolateMessage(rule.messageTemplate, {
            clientName: car.client.name,
            licensePlate: car.licensePlate,
            mileageSinceService,
          }),
        });
      }
    }

    return alerts;
  }

  /**
   * Simple template interpolation
   * Replaces {{variable}} with actual values
   */
  private static interpolateMessage(template: string, variables: Record<string, any>): string {
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, String(value));
    }
    return message;
  }

  /**
   * Process retention alerts and send messages
   * This would be called by a background job
   * @deprecated Use runRetentionGeneration instead
   */
  static async processRetentionAlerts(garageId: string) {
    const alerts = await this.getRetentionAlerts(garageId);
    const sentMessages = [];

    for (const alert of alerts) {
      // Here you would integrate with the messaging service
      // For now, we'll just log the alert
      console.log(`Would send message to ${alert.clientPhone}: ${alert.message}`);
      sentMessages.push(alert);
    }

    return {
      totalAlerts: alerts.length,
      sentMessages,
    };
  }

  /**
   * Run retention generation to create MessageQueue items
   * @param garageId The garage ID
   * @param lookaheadDays How many days ahead to schedule messages (default: 14)
   */
  static async runRetentionGeneration(garageId: string, lookaheadDays: number = 14) {
    const rules = await this.getRules(garageId);
    const created: any[] = [];
    const blocked: any[] = [];
    const skipped: any[] = [];

    for (const rule of rules) {
      if (rule.type === 'TIME') {
        const result = await this.generateTimeBasedQueue(garageId, rule, lookaheadDays);
        created.push(...result.created);
        blocked.push(...result.blocked);
        skipped.push(...result.skipped);
      } else if (rule.type === 'MILEAGE') {
        const result = await this.generateMileageBasedQueue(garageId, rule);
        created.push(...result.created);
        blocked.push(...result.blocked);
        skipped.push(...result.skipped);
      }
    }

    return {
      created: created.length,
      blocked: blocked.length,
      skipped: skipped.length,
      items: { created, blocked, skipped },
    };
  }

  /**
   * Generate queue items for time-based retention rules
   */
  private static async generateTimeBasedQueue(
    garageId: string,
    rule: any,
    lookaheadDays: number
  ) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - rule.threshold);

    const lookaheadEnd = new Date();
    lookaheadEnd.setDate(lookaheadEnd.getDate() + lookaheadDays);

    const cars = await prisma.car.findMany({
      where: {
        client: { garageId },
        OR: [
          { lastServiceDate: { lte: thresholdDate } },
          { lastServiceDate: null },
        ],
      },
      include: {
        client: true,
        serviceVisits: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    const created: any[] = [];
    const blocked: any[] = [];
    const skipped: any[] = [];

    for (const car of cars) {
      // Check for existing active queue items for this client/car combination
      const existing = await prisma.messageQueue.findFirst({
        where: {
          garageId,
          clientId: car.client.id,
          carId: car.id,
          triggerType: 'SERVICE_DUE_TIME',
          status: {
            in: ['SCHEDULED', 'DUE', 'SENDING'],
          },
        },
      });

      if (existing) {
        skipped.push({
          clientId: car.client.id,
          carId: car.id,
          reason: 'Active queue item already exists',
        });
        continue;
      }

      const daysSinceService = car.lastServiceDate
        ? Math.floor((Date.now() - car.lastServiceDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const variables = {
        clientName: car.client.name,
        licensePlate: car.licensePlate,
        daysSinceService: daysSinceService || 'unknown',
      };

      const renderedMessage = this.interpolateMessage(rule.messageTemplate, variables);

      // Schedule for immediate dispatch
      const scheduledFor = new Date();

      const queueItem = await prisma.messageQueue.create({
        data: {
          garageId,
          clientId: car.client.id,
          carId: car.id,
          triggerType: 'SERVICE_DUE_TIME',
          channel: 'WHATSAPP', // Default to WhatsApp, could be configurable
          templateKey: rule.id,
          variablesJson: JSON.stringify(variables),
          renderedPreview: renderedMessage,
          scheduledFor,
          status: 'DUE',
        },
      });

      created.push(queueItem);
    }

    return { created, blocked, skipped };
  }

  /**
   * Generate queue items for mileage-based retention rules
   */
  private static async generateMileageBasedQueue(garageId: string, rule: any) {
    const cars = await prisma.car.findMany({
      where: {
        client: { garageId },
      },
      include: {
        client: true,
        serviceVisits: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    const created: any[] = [];
    const blocked: any[] = [];
    const skipped: any[] = [];

    for (const car of cars) {
      // Check for existing active queue items
      const existing = await prisma.messageQueue.findFirst({
        where: {
          garageId,
          clientId: car.client.id,
          carId: car.id,
          triggerType: 'SERVICE_DUE_MILEAGE',
          status: {
            in: ['SCHEDULED', 'DUE', 'SENDING'],
          },
        },
      });

      if (existing) {
        skipped.push({
          clientId: car.client.id,
          carId: car.id,
          reason: 'Active queue item already exists',
        });
        continue;
      }

      // Check if we have mileage data
      if (car.currentMileage === 0) {
        const queueItem = await prisma.messageQueue.create({
          data: {
            garageId,
            clientId: car.client.id,
            carId: car.id,
            triggerType: 'SERVICE_DUE_MILEAGE',
            channel: 'WHATSAPP',
            templateKey: rule.id,
            variablesJson: JSON.stringify({}),
            renderedPreview: null,
            scheduledFor: new Date(),
            status: 'BLOCKED',
            blockedReason: 'No mileage data available',
          },
        });

        blocked.push(queueItem);
        continue;
      }

      const lastVisit = car.serviceVisits[0];
      const mileageAtLastVisit = lastVisit?.mileageAtVisit || 0;
      const mileageSinceService = car.currentMileage - mileageAtLastVisit;

      if (mileageSinceService >= rule.threshold) {
        const variables = {
          clientName: car.client.name,
          licensePlate: car.licensePlate,
          mileageSinceService,
          currentMileage: car.currentMileage,
        };

        const renderedMessage = this.interpolateMessage(rule.messageTemplate, variables);

        const queueItem = await prisma.messageQueue.create({
          data: {
            garageId,
            clientId: car.client.id,
            carId: car.id,
            triggerType: 'SERVICE_DUE_MILEAGE',
            channel: 'WHATSAPP',
            templateKey: rule.id,
            variablesJson: JSON.stringify(variables),
            renderedPreview: renderedMessage,
            scheduledFor: new Date(),
            status: 'DUE',
          },
        });

        created.push(queueItem);
      }
    }

    return { created, blocked, skipped };
  }
}
