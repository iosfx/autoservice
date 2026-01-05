import { prisma } from '../db/client';
import { RetentionRuleType } from '@prisma/client';

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
}
