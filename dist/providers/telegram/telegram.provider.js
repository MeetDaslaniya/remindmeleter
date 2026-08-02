"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class TelegramProvider {
    channel = 'telegram';
    client;
    constructor(botToken = config_1.config.TELEGRAM_BOT_TOKEN) {
        this.client = axios_1.default.create({
            baseURL: `https://api.telegram.org/bot${botToken}`,
            timeout: 15000,
        });
    }
    async sendMessage(message) {
        try {
            await this.client.post('/sendMessage', {
                chat_id: message.chatId,
                text: message.text,
                parse_mode: message.parseMode ?? 'HTML',
            });
            logger_1.logger.info('Telegram message sent', { chatId: message.chatId });
        }
        catch (error) {
            logger_1.logger.error('Failed to send Telegram message', {
                chatId: message.chatId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new errors_1.AppError('Failed to send Telegram message', 502, 'TELEGRAM_SEND_FAILED');
        }
    }
    parseIncomingPayload(payload) {
        const update = payload;
        const message = update.message;
        if (!message?.text || !message.from) {
            return null;
        }
        return {
            messageId: String(message.message_id),
            chatId: String(message.chat.id),
            userId: String(message.from.id),
            text: message.text.trim(),
            username: message.from.username ?? message.from.first_name,
            timestamp: message.date,
        };
    }
    async setWebhook(url, secretToken) {
        await this.client.post('/setWebhook', {
            url,
            secret_token: secretToken,
            allowed_updates: ['message'],
            drop_pending_updates: true,
        });
        logger_1.logger.info('Telegram webhook configured', { url });
    }
    async getWebhookInfo() {
        const { data } = await this.client.get('/getWebhookInfo');
        return data;
    }
    async syncWebhook(baseUrl, secretToken) {
        const base = baseUrl.replace(/\/$/, '');
        const url = `${base}/telegram/webhook`;
        await this.setWebhook(url, secretToken);
    }
}
exports.TelegramProvider = TelegramProvider;
//# sourceMappingURL=telegram.provider.js.map