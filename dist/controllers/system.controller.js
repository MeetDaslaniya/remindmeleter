"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemController = exports.SystemController = void 0;
const container_1 = require("../config/container");
const response_1 = require("../utils/response");
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
}
exports.SystemController = SystemController;
exports.systemController = new SystemController();
//# sourceMappingURL=system.controller.js.map