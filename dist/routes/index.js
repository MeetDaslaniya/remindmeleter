"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_routes_1 = __importDefault(require("./health.routes"));
const telegram_routes_1 = __importDefault(require("./telegram.routes"));
const reminder_routes_1 = __importDefault(require("./reminder.routes"));
const system_routes_1 = __importDefault(require("./system.routes"));
const router = (0, express_1.Router)();
router.use('/health', health_routes_1.default);
router.use('/telegram', telegram_routes_1.default);
router.use('/api/reminders', reminder_routes_1.default);
router.use('/api/system', system_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map