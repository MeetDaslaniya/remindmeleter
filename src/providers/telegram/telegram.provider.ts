import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import {
  IncomingMessage,
  MessagingProvider,
  OutgoingMessage,
  SendMessageResult,
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
  callback_query?: {
    id: string;
    data?: string;
    from: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
  };
}

export interface TelegramCallbackQuery {
  callbackId: string;
  userId: string;
  chatId: string;
  messageId?: number;
  data: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
}

const TELEGRAM_ALLOWED_UPDATES = ['message', 'callback_query'];

export class TelegramProvider implements MessagingProvider {
  readonly channel = 'telegram';
  private readonly client: AxiosInstance;

  constructor(botToken: string = config.TELEGRAM_BOT_TOKEN) {
    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${botToken}`,
      timeout: 15000,
    });
  }

  async sendMessage(message: OutgoingMessage): Promise<SendMessageResult> {
    try {
      const { data } = await this.client.post<TelegramSendMessageResponse>('/sendMessage', {
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode ?? 'HTML',
        ...(message.inlineKeyboard
          ? { reply_markup: toTelegramInlineKeyboard(message.inlineKeyboard) }
          : {}),
      });
      logger.info('Telegram message sent', { chatId: message.chatId });
      const messageId = data.result?.message_id;
      return messageId !== undefined ? { messageId: String(messageId) } : {};
    } catch (error) {
      logger.error('Failed to send Telegram message', {
        chatId: message.chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('Failed to send Telegram message', 502, 'TELEGRAM_SEND_FAILED');
    }
  }

  async editMessage(options: {
    chatId: string;
    messageId: number;
    text: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    inlineKeyboard?: OutgoingMessage['inlineKeyboard'] | null;
  }): Promise<void> {
    try {
      await this.client.post('/editMessageText', {
        chat_id: options.chatId,
        message_id: options.messageId,
        text: options.text,
        parse_mode: options.parseMode ?? 'HTML',
        reply_markup:
          options.inlineKeyboard === null
            ? { inline_keyboard: [] }
            : options.inlineKeyboard
              ? toTelegramInlineKeyboard(options.inlineKeyboard)
              : undefined,
      });
    } catch (error) {
      const description = axiosErrorDescription(error);
      if (description.includes('message is not modified')) {
        return;
      }
      logger.warn('Failed to edit Telegram message', {
        chatId: options.chatId,
        messageId: options.messageId,
        error: description,
      });
      throw new AppError('Failed to edit Telegram message', 502, 'TELEGRAM_EDIT_FAILED');
    }
  }

  async answerCallbackQuery(callbackId: string, text?: string): Promise<void> {
    try {
      await this.client.post('/answerCallbackQuery', {
        callback_query_id: callbackId,
        ...(text ? { text } : {}),
      });
    } catch (error) {
      logger.warn('Failed to answer Telegram callback query', {
        callbackId,
        error: error instanceof Error ? error.message : String(error),
      });
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

  parseCallbackQuery(payload: unknown): TelegramCallbackQuery | null {
    const update = payload as TelegramUpdate;
    const callback = update.callback_query;
    if (!callback?.data || !callback.from) {
      return null;
    }

    const chatId = callback.message?.chat.id;
    return {
      callbackId: callback.id,
      userId: String(callback.from.id),
      chatId: chatId !== undefined ? String(chatId) : '',
      ...(callback.message?.message_id !== undefined
        ? { messageId: callback.message.message_id }
        : {}),
      data: callback.data,
      username: callback.from.username,
      firstName: callback.from.first_name,
      lastName: callback.from.last_name,
    };
  }

  async setWebhook(url: string, secretToken: string, dropPending = true): Promise<void> {
    await this.client.post('/setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: TELEGRAM_ALLOWED_UPDATES,
      drop_pending_updates: dropPending,
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

  /** Ensure an already-configured webhook also receives inline-button callbacks. */
  async ensureCallbackUpdates(secretToken: string): Promise<void> {
    try {
      const info = await this.getWebhookInfo();
      const url = info.result?.url;
      if (!url) {
        return;
      }

      const allowed = info.result.allowed_updates ?? [];
      const alreadyAllowsCallbacks =
        allowed.length === 0 ||
        (allowed.includes('message') && allowed.includes('callback_query'));
      if (alreadyAllowsCallbacks) {
        return;
      }

      await this.setWebhook(url, secretToken, false);
      logger.info('Telegram webhook updated to include callback_query', { url });
    } catch (error) {
      logger.warn('Could not ensure Telegram callback_query updates', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function toTelegramInlineKeyboard(
  keyboard: NonNullable<OutgoingMessage['inlineKeyboard']>
): { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  return {
    inline_keyboard: keyboard.map((row) =>
      row.map((button) => ({
        text: button.text,
        callback_data: button.callbackData,
      }))
    ),
  };
}

function axiosErrorDescription(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const description = (error.response?.data as { description?: string } | undefined)?.description;
    if (description) {
      return description;
    }
  }
  return error instanceof Error ? error.message : String(error);
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
