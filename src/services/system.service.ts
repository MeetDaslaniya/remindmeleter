import { config } from '../config';
import { SystemStatus, WebhookStatus } from '../types';
import { TelegramProvider, TelegramWebhookInfoResponse } from '../providers/telegram/telegram.provider';
import { HealthService } from './health.service';
import { logger } from '../utils/logger';

const TELEGRAM_WEBHOOK_INFO_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class SystemService {
  constructor(
    private readonly healthService: HealthService,
    private readonly telegramProvider: TelegramProvider
  ) {}

  getBaseUrl(): string {
    return config.BASE_URL.replace(/\/$/, '');
  }

  getExpectedWebhookUrl(): string {
    return `${this.getBaseUrl()}/telegram/webhook`;
  }

  async getWebhookStatus(): Promise<WebhookStatus> {
    const expectedUrl = this.getExpectedWebhookUrl();
    let info: TelegramWebhookInfoResponse;

    try {
      info = await withTimeout(
        this.telegramProvider.getWebhookInfo(),
        TELEGRAM_WEBHOOK_INFO_MS,
        'Telegram getWebhookInfo'
      );
    } catch (error) {
      logger.error('Failed to fetch Telegram webhook info', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        configured: false,
        url: '',
        expectedUrl,
        matchesExpected: false,
        pendingUpdateCount: 0,
        lastErrorMessage: 'Could not reach Telegram API',
      };
    }

    const result = info.result;
    const url = result?.url ?? '';
    const configured = Boolean(url);

    return {
      configured,
      url,
      expectedUrl,
      matchesExpected: configured && this.normalizeUrl(url) === this.normalizeUrl(expectedUrl),
      pendingUpdateCount: result?.pending_update_count ?? 0,
      ...(result?.last_error_message ? { lastErrorMessage: result.last_error_message } : {}),
      ...(result?.last_error_date
        ? { lastErrorDate: new Date(result.last_error_date * 1000).toISOString() }
        : {}),
      ...(result?.ip_address ? { ipAddress: result.ip_address } : {}),
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const [localApi, webhook] = await Promise.all([
      this.healthService.getStatus(),
      this.getWebhookStatus(),
    ]);

    return {
      baseUrl: this.getBaseUrl(),
      localApi,
      webhook,
      checkedAt: new Date().toISOString(),
    };
  }

  async syncWebhook(): Promise<{ webhookUrl: string }> {
    const webhookUrl = this.getExpectedWebhookUrl();
    await this.telegramProvider.syncWebhook(this.getBaseUrl(), config.TELEGRAM_WEBHOOK_SECRET);
    return { webhookUrl };
  }

  private normalizeUrl(value: string): string {
    return value.replace(/\/$/, '').toLowerCase();
  }
}
