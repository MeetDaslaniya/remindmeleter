"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const PUBLIC_URL_PROBE_MS = 5000;
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
    currentBaseUrl;
    constructor(healthService, telegramProvider) {
        this.healthService = healthService;
        this.telegramProvider = telegramProvider;
        this.currentBaseUrl = this.normalizeBaseUrl(config_1.config.BASE_URL);
    }
    getBaseUrl() {
        return this.currentBaseUrl;
    }
    setBaseUrl(baseUrl) {
        this.currentBaseUrl = this.normalizeBaseUrl(baseUrl);
        return this.currentBaseUrl;
    }
    getExpectedWebhookUrl() {
        const base = this.currentBaseUrl;
        return `${base}/telegram/webhook`;
    }
    async checkPublicBaseUrl() {
        const healthUrl = `${this.currentBaseUrl}/health`;
        const started = Date.now();
        try {
            const response = await axios_1.default.get(healthUrl, {
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
        }
        catch (error) {
            return {
                live: false,
                latencyMs: Date.now() - started,
                error: error instanceof Error ? error.message : String(error),
            };
        }
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
    async getSystemStatus() {
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
    async syncWebhook() {
        const webhookUrl = this.getExpectedWebhookUrl();
        await this.telegramProvider.syncWebhook(this.currentBaseUrl, config_1.config.TELEGRAM_WEBHOOK_SECRET);
        return { webhookUrl };
    }
    normalizeBaseUrl(value) {
        const trimmed = value.trim();
        let url;
        try {
            url = new URL(trimmed);
        }
        catch {
            throw new errors_1.ValidationError('BASE_URL must be a valid URL');
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new errors_1.ValidationError('BASE_URL must use http or https');
        }
        return url.toString().replace(/\/$/, '');
    }
    normalizeUrl(value) {
        return value.replace(/\/$/, '').toLowerCase();
    }
}
exports.SystemService = SystemService;
//# sourceMappingURL=system.service.js.map