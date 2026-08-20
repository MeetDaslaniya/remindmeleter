import { SystemStatus, WebhookStatus } from '../types';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { HealthService } from './health.service';
export declare class SystemService {
    private readonly healthService;
    private readonly telegramProvider;
    constructor(healthService: HealthService, telegramProvider: TelegramProvider);
    getBaseUrl(): string;
    getExpectedWebhookUrl(): string;
    getWebhookStatus(): Promise<WebhookStatus>;
    getSystemStatus(): Promise<SystemStatus>;
    syncWebhook(): Promise<{
        webhookUrl: string;
    }>;
    private normalizeUrl;
}
//# sourceMappingURL=system.service.d.ts.map