import {
  IncomingMessage,
  MessagingProvider,
  OutgoingMessage,
  SendMessageResult,
} from '../messaging.provider';
import { AppError } from '../../utils/errors';

/**
 * Stub WhatsApp provider.
 * Implement sendMessage / parseIncomingPayload against the WhatsApp Business Cloud API,
 * then register this class in `config/container.ts` beside TelegramProvider.
 */
export class WhatsappProvider implements MessagingProvider {
  readonly channel = 'whatsapp';

  async sendMessage(_message: OutgoingMessage): Promise<SendMessageResult> {
    throw new AppError(
      'WhatsApp provider is not configured yet',
      501,
      'WHATSAPP_NOT_IMPLEMENTED'
    );
  }

  parseIncomingPayload(_payload: unknown): IncomingMessage | null {
    return null;
  }
}
