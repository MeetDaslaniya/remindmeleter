"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramController = exports.TelegramController = void 0;
const container_1 = require("../config/container");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
class TelegramController {
    async webhook(req, res, _next) {
        try {
            // Acknowledge immediately — Telegram expects a fast 200
            res.sendStatus(200);
            await container_1.container.telegramWebhookService.handleUpdate(req.body);
        }
        catch (error) {
            logger_1.logger.error('Telegram webhook handler error', {
                error: error instanceof Error ? error.message : String(error),
            });
            // Response already sent; avoid next() after headers
        }
    }
    async webhookInfo(_req, res, next) {
        try {
            const info = await container_1.container.telegramProvider.getWebhookInfo();
            (0, response_1.sendSuccess)(res, info);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TelegramController = TelegramController;
exports.telegramController = new TelegramController();
//# sourceMappingURL=telegram.controller.js.map