import { MessageChannel } from '@prisma/client';
import { prisma } from '../db/client';

export async function logMessage(jobId: string, channel: MessageChannel, content: string) {
  return prisma.messageLog.create({
    data: {
      jobId,
      channel,
      content,
    },
  });
}

export async function sendMessage(jobId: string, content: string) {
  // Stubbed messaging engine. Replace with WhatsApp integration later.
  return logMessage(jobId, MessageChannel.WHATSAPP, content);
}
