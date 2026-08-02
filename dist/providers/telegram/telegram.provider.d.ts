import { IncomingMessage, MessagingProvider, OutgoingMessage } from '../messaging.provider';
export declare class TelegramProvider implements MessagingProvider {
    readonly channel = "telegram";
    private readonly client;
    constructor(botToken?: string);
    sendMessage(message: OutgoingMessage): Promise<void>;
    parseIncomingPayload(payload: unknown): IncomingMessage | null;
    setWebhook(url: string, secretToken: string): Promise<void>;
    getWebhookInfo(): Promise<TelegramWebhookInfoResponse>;
    syncWebhook(baseUrl: string, secretToken: string): Promise<void>;
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