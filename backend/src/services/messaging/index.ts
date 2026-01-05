import { MessagingProvider } from './MessagingProvider';
import { MockMessagingProvider } from './MockMessagingProvider';

let providerInstance: MessagingProvider | null = null;

export function getMessagingProvider(): MessagingProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = process.env.MESSAGING_PROVIDER || 'mock';

  switch (providerType.toLowerCase()) {
    case 'mock':
      providerInstance = new MockMessagingProvider();
      break;
    // Add other providers here in the future
    // case 'twilio':
    //   providerInstance = new TwilioMessagingProvider();
    //   break;
    default:
      console.warn(`Unknown messaging provider: ${providerType}, falling back to mock`);
      providerInstance = new MockMessagingProvider();
  }

  console.log(`Messaging provider initialized: ${providerInstance.getProviderName()}`);
  return providerInstance;
}

export * from './MessagingProvider';
export * from './MockMessagingProvider';
