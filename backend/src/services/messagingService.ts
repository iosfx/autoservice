import { MessageType, MessageStatus } from '@prisma/client';
import { prisma } from '../db/client';

interface SendMessageParams {
  clientId: string;
  type: MessageType;
  content: string;
}

export class MessagingService {
  /**
   * Send a message via WhatsApp
   * This is a stub - implement actual WhatsApp API integration
   */
  private static async sendWhatsApp(phone: string, content: string): Promise<boolean> {
    // TODO: Implement actual WhatsApp API call
    // const response = await fetch(process.env.WHATSAPP_API_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     to: phone,
    //     message: content,
    //   }),
    // });
    // return response.ok;

    console.log(`[WhatsApp] Sending to ${phone}: ${content}`);
    return true; // Simulate success
  }

  /**
   * Send a message via SMS
   * This is a stub - implement actual SMS API integration
   */
  private static async sendSMS(phone: string, content: string): Promise<boolean> {
    // TODO: Implement actual SMS API call
    // const response = await fetch(process.env.SMS_PROVIDER_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SMS_PROVIDER_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     to: phone,
    //     message: content,
    //   }),
    // });
    // return response.ok;

    console.log(`[SMS] Sending to ${phone}: ${content}`);
    return true; // Simulate success
  }

  /**
   * Send a message to a client and log it
   */
  static async sendMessage({ clientId, type, content }: SendMessageParams) {
    try {
      // Get client info
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        throw new Error('Client not found');
      }

      // Send message based on type
      let success = false;
      if (type === 'WHATSAPP') {
        success = await this.sendWhatsApp(client.phone, content);
      } else if (type === 'SMS') {
        success = await this.sendSMS(client.phone, content);
      }

      // Log the message
      const messageLog = await prisma.messageLog.create({
        data: {
          clientId,
          type,
          content,
          status: success ? 'SENT' : 'FAILED',
        },
      });

      return {
        success,
        messageLog,
      };
    } catch (error) {
      console.error('Error sending message:', error);

      // Log failed message
      await prisma.messageLog.create({
        data: {
          clientId,
          type,
          content,
          status: 'FAILED',
        },
      });

      throw error;
    }
  }

  /**
   * Get message history for a client
   */
  static async getClientMessages(clientId: string) {
    return prisma.messageLog.findMany({
      where: { clientId },
      orderBy: { sentAt: 'desc' },
    });
  }

  /**
   * Get recent message logs for a garage
   */
  static async getGarageMessages(garageId: string, limit: number = 50) {
    return prisma.messageLog.findMany({
      where: {
        client: { garageId },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }
}
