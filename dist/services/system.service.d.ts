import { PublicUrlCheck, SystemStatus, WebhookStatus } from '../types';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { HealthService } from './health.service';
export declare class SystemService {
    private readonly healthService;
    private readonly telegramProvider;
    private currentBaseUrl;
    constructor(healthService: HealthService, telegramProvider: TelegramProvider);
    getBaseUrl(): string;
    setBaseUrl(baseUrl: string): string;
    getExpectedWebhookUrl(): string;
    checkPublicBaseUrl(): Promise<PublicUrlCheck>;
    getWebhookStatus(): Promise<WebhookStatus>;
    getSystemStatus(): Promise<SystemStatus>;
    syncWebhook(): Promise<{
        webhookUrl: string;
    }>;
    private normalizeBaseUrl;
    private normalizeUrl;
}
//# sourceMappingURL=system.service.d.ts.map