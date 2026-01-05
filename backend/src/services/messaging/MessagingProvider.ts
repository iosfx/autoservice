import { MessageChannel } from '@prisma/client';

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export interface MessagingProvider {
  /**
   * Send a message via the provider
   */
  sendMessage(phone: string, content: string, channel: MessageChannel): Promise<SendMessageResult>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
