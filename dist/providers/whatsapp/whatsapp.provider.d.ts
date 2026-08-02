import { IncomingMessage, MessagingProvider, OutgoingMessage } from '../messaging.provider';
/**
 * Stub WhatsApp provider.
 * Implement sendMessage / parseIncomingPayload against the WhatsApp Business Cloud API,
 * then register this class in `config/container.ts` beside TelegramProvider.
 */
export declare class WhatsappProvider implements MessagingProvider {
    readonly channel = "whatsapp";
    sendMessage(_message: OutgoingMessage): Promise<void>;
    parseIncomingPayload(_payload: unknown): IncomingMessage | null;
}
//# sourceMappingURL=whatsapp.provider.d.ts.map