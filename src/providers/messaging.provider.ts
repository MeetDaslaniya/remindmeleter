/**
 * Messaging provider adapter — implement for WhatsApp, Slack, Discord, etc.
 * Business logic depends only on this interface.
 */
export interface OutgoingMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface IncomingMessage {
  messageId: string;
  chatId: string;
  userId: string;
  text: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  timestamp: number;
}

export interface MessagingProvider {
  readonly channel: string;
  sendMessage(message: OutgoingMessage): Promise<void>;
  parseIncomingPayload(payload: unknown): IncomingMessage | null;
}
