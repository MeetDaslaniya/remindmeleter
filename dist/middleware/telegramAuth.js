"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramWebhookAuth = telegramWebhookAuth;
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
function telegramWebhookAuth(req, _res, next) {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== config_1.config.TELEGRAM_WEBHOOK_SECRET) {
        next(new errors_1.UnauthorizedError('Invalid Telegram webhook secret'));
        return;
    }
    next();
}
//# sourceMappingURL=telegramAuth.js.map