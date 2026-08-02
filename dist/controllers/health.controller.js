"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthController = exports.HealthController = void 0;
const container_1 = require("../config/container");
const response_1 = require("../utils/response");
class HealthController {
    async getHealth(_req, res, next) {
        try {
            const status = await container_1.container.healthService.getStatus();
            (0, response_1.sendSuccess)(res, status);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.HealthController = HealthController;
exports.healthController = new HealthController();
//# sourceMappingURL=health.controller.js.map