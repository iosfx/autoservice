import { MessageChannel } from '@prisma/client';
import { MessagingProvider, SendMessageResult } from './MessagingProvider';

export class MockMessagingProvider implements MessagingProvider {
  private failRate: number;
  private failPhoneSuffix: string;

  constructor() {
    this.failRate = parseFloat(process.env.MOCK_MESSAGE_FAIL_RATE || '0');
    this.failPhoneSuffix = process.env.MOCK_MESSAGE_FAIL_PHONE_SUFFIX || '';
  }

  async sendMessage(
    phone: string,
    content: string,
    channel: MessageChannel
  ): Promise<SendMessageResult> {
    // Simulate network delay
    await this.sleep(100 + Math.random() * 200);

    // Deterministic failure based on phone suffix
    if (this.failPhoneSuffix && phone.endsWith(this.failPhoneSuffix)) {
      console.log(`[MockMessaging] FAILED (phone suffix match): ${channel} to ${phone}`);
      return {
        success: false,
        error: `Mock failure: phone ends with ${this.failPhoneSuffix}`,
      };
    }

    // Random failure based on fail rate
    if (Math.random() < this.failRate) {
      console.log(`[MockMessaging] FAILED (random): ${channel} to ${phone}`);
      return {
        success: false,
        error: 'Mock random failure',
      };
    }

    // Success
    console.log(`[MockMessaging] SENT: ${channel} to ${phone} - "${content.substring(0, 50)}..."`);
    return {
      success: true,
    };
  }

  getProviderName(): string {
    return 'MockMessagingProvider';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
