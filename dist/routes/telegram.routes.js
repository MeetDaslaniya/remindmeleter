"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const telegram_controller_1 = require("../controllers/telegram.controller");
const telegramAuth_1 = require("../middleware/telegramAuth");
const router = (0, express_1.Router)();
router.post('/webhook', telegramAuth_1.telegramWebhookAuth, (req, res, next) => {
    void telegram_controller_1.telegramController.webhook(req, res, next);
});
router.get('/webhook-info', (req, res, next) => {
    void telegram_controller_1.telegramController.webhookInfo(req, res, next);
});
exports.default = router;
//# sourceMappingURL=telegram.routes.js.map