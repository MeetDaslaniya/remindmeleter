import axios from 'axios';
import { config } from '../config';
import { PublicUrlCheck, SystemStatus, WebhookStatus } from '../types';
import { TelegramProvider, TelegramWebhookInfoResponse } from '../providers/telegram/telegram.provider';
import { HealthService } from './health.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';

const PUBLIC_URL_PROBE_MS = 5000;
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
  private currentBaseUrl: string;

  constructor(
    private readonly healthService: HealthService,
    private readonly telegramProvider: TelegramProvider
  ) {
    this.currentBaseUrl = this.normalizeBaseUrl(config.BASE_URL);
  }

  getBaseUrl(): string {
    return this.currentBaseUrl;
  }

  setBaseUrl(baseUrl: string): string {
    this.currentBaseUrl = this.normalizeBaseUrl(baseUrl);
    return this.currentBaseUrl;
  }

  getExpectedWebhookUrl(): string {
    const base = this.currentBaseUrl;
    return `${base}/telegram/webhook`;
  }

  async checkPublicBaseUrl(): Promise<PublicUrlCheck> {
    const healthUrl = `${this.currentBaseUrl}/health`;
    const started = Date.now();

    try {
      const response = await axios.get(healthUrl, {
        timeout: PUBLIC_URL_PROBE_MS,
        validateStatus: () => true,
        headers: {
          'bypass-tunnel-reminder': 'true',
          Accept: 'application/json',
        },
      });

      const latencyMs = Date.now() - started;
      const live = response.status >= 200 && response.status < 300;

      return {
        live,
        statusCode: response.status,
        latencyMs,
        ...(live ? {} : { error: `HTTP ${response.status}` }),
      };
    } catch (error) {
      return {
        live: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
      ...(result?.last_error_message
        ? { lastErrorMessage: result.last_error_message }
        : {}),
      ...(result?.last_error_date
        ? {
            lastErrorDate: new Date(result.last_error_date * 1000).toISOString(),
          }
        : {}),
      ...(result?.ip_address ? { ipAddress: result.ip_address } : {}),
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const [localApi, publicUrl, webhook] = await Promise.all([
      this.healthService.getStatus(),
      this.checkPublicBaseUrl(),
      this.getWebhookStatus(),
    ]);

    return {
      baseUrl: this.currentBaseUrl,
      publicUrl,
      localApi,
      webhook,
      checkedAt: new Date().toISOString(),
    };
  }

  async syncWebhook(): Promise<{ webhookUrl: string }> {
    const webhookUrl = this.getExpectedWebhookUrl();
    await this.telegramProvider.syncWebhook(this.currentBaseUrl, config.TELEGRAM_WEBHOOK_SECRET);
    return { webhookUrl };
  }

  private normalizeBaseUrl(value: string): string {
    const trimmed = value.trim();
    let url: URL;

    try {
      url = new URL(trimmed);
    } catch {
      throw new ValidationError('BASE_URL must be a valid URL');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationError('BASE_URL must use http or https');
    }

    return url.toString().replace(/\/$/, '');
  }

  private normalizeUrl(value: string): string {
    return value.replace(/\/$/, '').toLowerCase();
  }
}
