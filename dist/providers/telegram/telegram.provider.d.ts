import { IncomingMessage, MessagingProvider, OutgoingMessage, SendMessageResult } from '../messaging.provider';
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
export declare class TelegramProvider implements MessagingProvider {
    readonly channel = "telegram";
    private readonly client;
    constructor(botToken?: string);
    sendMessage(message: OutgoingMessage): Promise<SendMessageResult>;
    editMessage(options: {
        chatId: string;
        messageId: number;
        text: string;
        parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
        inlineKeyboard?: OutgoingMessage['inlineKeyboard'] | null;
    }): Promise<void>;
    answerCallbackQuery(callbackId: string, text?: string): Promise<void>;
    parseIncomingPayload(payload: unknown): IncomingMessage | null;
    parseCallbackQuery(payload: unknown): TelegramCallbackQuery | null;
    setWebhook(url: string, secretToken: string, dropPending?: boolean): Promise<void>;
    getWebhookInfo(): Promise<TelegramWebhookInfoResponse>;
    syncWebhook(baseUrl: string, secretToken: string): Promise<void>;
    /** Ensure an already-configured webhook also receives inline-button callbacks. */
    ensureCallbackUpdates(secretToken: string): Promise<void>;
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
//# sourceMappingURL=telegram.provider.d.ts.map