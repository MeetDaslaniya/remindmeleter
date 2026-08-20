"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const TELEGRAM_WEBHOOK_INFO_MS = 8000;
function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        promise
            .then((value) => {
            clearTimeout(timer);
            resolve(value);
        })
            .catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
class SystemService {
    healthService;
    telegramProvider;
    constructor(healthService, telegramProvider) {
        this.healthService = healthService;
        this.telegramProvider = telegramProvider;
    }
    getBaseUrl() {
        return config_1.config.BASE_URL.replace(/\/$/, '');
    }
    getExpectedWebhookUrl() {
        return `${this.getBaseUrl()}/telegram/webhook`;
    }
    async getWebhookStatus() {
        const expectedUrl = this.getExpectedWebhookUrl();
        let info;
        try {
            info = await withTimeout(this.telegramProvider.getWebhookInfo(), TELEGRAM_WEBHOOK_INFO_MS, 'Telegram getWebhookInfo');
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Telegram webhook info', {
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
    async getSystemStatus() {
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
    async syncWebhook() {
        const webhookUrl = this.getExpectedWebhookUrl();
        await this.telegramProvider.syncWebhook(this.getBaseUrl(), config_1.config.TELEGRAM_WEBHOOK_SECRET);
        return { webhookUrl };
    }
    normalizeUrl(value) {
        return value.replace(/\/$/, '').toLowerCase();
    }
}
exports.SystemService = SystemService;
//# sourceMappingURL=system.service.js.map