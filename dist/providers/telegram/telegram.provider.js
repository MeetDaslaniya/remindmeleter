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
const TELEGRAM_ALLOWED_UPDATES = ['message', 'callback_query'];
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
            const { data } = await this.client.post('/sendMessage', {
                chat_id: message.chatId,
                text: message.text,
                parse_mode: message.parseMode ?? 'HTML',
                ...(message.inlineKeyboard
                    ? { reply_markup: toTelegramInlineKeyboard(message.inlineKeyboard) }
                    : {}),
            });
            logger_1.logger.info('Telegram message sent', { chatId: message.chatId });
            const messageId = data.result?.message_id;
            return messageId !== undefined ? { messageId: String(messageId) } : {};
        }
        catch (error) {
            logger_1.logger.error('Failed to send Telegram message', {
                chatId: message.chatId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new errors_1.AppError('Failed to send Telegram message', 502, 'TELEGRAM_SEND_FAILED');
        }
    }
    async editMessage(options) {
        try {
            await this.client.post('/editMessageText', {
                chat_id: options.chatId,
                message_id: options.messageId,
                text: options.text,
                parse_mode: options.parseMode ?? 'HTML',
                reply_markup: options.inlineKeyboard === null
                    ? { inline_keyboard: [] }
                    : options.inlineKeyboard
                        ? toTelegramInlineKeyboard(options.inlineKeyboard)
                        : undefined,
            });
        }
        catch (error) {
            const description = axiosErrorDescription(error);
            if (description.includes('message is not modified')) {
                return;
            }
            logger_1.logger.warn('Failed to edit Telegram message', {
                chatId: options.chatId,
                messageId: options.messageId,
                error: description,
            });
            throw new errors_1.AppError('Failed to edit Telegram message', 502, 'TELEGRAM_EDIT_FAILED');
        }
    }
    async answerCallbackQuery(callbackId, text) {
        try {
            await this.client.post('/answerCallbackQuery', {
                callback_query_id: callbackId,
                ...(text ? { text } : {}),
            });
        }
        catch (error) {
            logger_1.logger.warn('Failed to answer Telegram callback query', {
                callbackId,
                error: error instanceof Error ? error.message : String(error),
            });
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
            username: message.from.username,
            firstName: message.from.first_name,
            lastName: message.from.last_name,
            timestamp: message.date,
        };
    }
    parseCallbackQuery(payload) {
        const update = payload;
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
    async setWebhook(url, secretToken, dropPending = true) {
        await this.client.post('/setWebhook', {
            url,
            secret_token: secretToken,
            allowed_updates: TELEGRAM_ALLOWED_UPDATES,
            drop_pending_updates: dropPending,
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
    /** Ensure an already-configured webhook also receives inline-button callbacks. */
    async ensureCallbackUpdates(secretToken) {
        try {
            const info = await this.getWebhookInfo();
            const url = info.result?.url;
            if (!url) {
                return;
            }
            const allowed = info.result.allowed_updates ?? [];
            const alreadyAllowsCallbacks = allowed.length === 0 ||
                (allowed.includes('message') && allowed.includes('callback_query'));
            if (alreadyAllowsCallbacks) {
                return;
            }
            await this.setWebhook(url, secretToken, false);
            logger_1.logger.info('Telegram webhook updated to include callback_query', { url });
        }
        catch (error) {
            logger_1.logger.warn('Could not ensure Telegram callback_query updates', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
exports.TelegramProvider = TelegramProvider;
function toTelegramInlineKeyboard(keyboard) {
    return {
        inline_keyboard: keyboard.map((row) => row.map((button) => ({
            text: button.text,
            callback_data: button.callbackData,
        }))),
    };
}
function axiosErrorDescription(error) {
    if (axios_1.default.isAxiosError(error)) {
        const description = error.response?.data?.description;
        if (description) {
            return description;
        }
    }
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=telegram.provider.js.map