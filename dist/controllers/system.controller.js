"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemController = exports.SystemController = void 0;
const container_1 = require("../config/container");
const response_1 = require("../utils/response");
const errors_1 = require("../utils/errors");
class SystemController {
    async getStatus(_req, res, next) {
        try {
            const status = await container_1.container.systemService.getSystemStatus();
            (0, response_1.sendSuccess)(res, status);
        }
        catch (error) {
            next(error);
        }
    }
    async syncWebhook(_req, res, next) {
        try {
            const result = await container_1.container.systemService.syncWebhook();
            (0, response_1.sendSuccess)(res, result, 'Telegram webhook updated from BASE_URL');
        }
        catch (error) {
            next(error);
        }
    }
    async setBaseUrl(req, res, next) {
        try {
            const body = req.body;
            if (!body?.baseUrl || typeof body.baseUrl !== 'string') {
                throw new errors_1.ValidationError('baseUrl is required');
            }
            const baseUrl = container_1.container.systemService.setBaseUrl(body.baseUrl);
            (0, response_1.sendSuccess)(res, { baseUrl }, 'Runtime BASE_URL updated (in-memory, non-persistent)');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SystemController = SystemController;
exports.systemController = new SystemController();
//# sourceMappingURL=system.controller.js.map