import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import {
  IncomingMessage,
  MessagingProvider,
  OutgoingMessage,
} from '../messaging.provider';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: {
      id: number;
      type: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export class TelegramProvider implements MessagingProvider {
  readonly channel = 'telegram';
  private readonly client: AxiosInstance;

  constructor(botToken: string = config.TELEGRAM_BOT_TOKEN) {
    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${botToken}`,
      timeout: 15000,
    });
  }

  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      await this.client.post('/sendMessage', {
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode ?? 'HTML',
      });
      logger.info('Telegram message sent', { chatId: message.chatId });
    } catch (error) {
      logger.error('Failed to send Telegram message', {
        chatId: message.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('Failed to send Telegram message', 502, 'TELEGRAM_SEND_FAILED');
    }
  }

  parseIncomingPayload(payload: unknown): IncomingMessage | null {
    const update = payload as TelegramUpdate;
    const message = update.message;

    if (!message?.text || !message.from) {
      return null;
    }

    return {
      messageId: String(message.message_id),
      chatId: String(message.chat.id),
      userId: String(message.from.id),
      text: message.text.trim(),
      username: message.from.username,
      firstName: message.from.first_name,
      lastName: message.from.last_name,
      timestamp: message.date,
    };
  }

  async setWebhook(url: string, secretToken: string): Promise<void> {
    await this.client.post('/setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    });
    logger.info('Telegram webhook configured', { url });
  }

  async getWebhookInfo(): Promise<TelegramWebhookInfoResponse> {
    const { data } = await this.client.get<TelegramWebhookInfoResponse>('/getWebhookInfo');
    return data;
  }

  async syncWebhook(baseUrl: string, secretToken: string): Promise<void> {
    const base = baseUrl.replace(/\/$/, '');
    const url = `${base}/telegram/webhook`;
    await this.setWebhook(url, secretToken);
  }
}

export interface TelegramWebhookInfoResponse {
  ok: boolean;
  result: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    ip_address?: string;
    allowed_updates?: string[];
  };
}
