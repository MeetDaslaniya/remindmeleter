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
const customer_routes_1 = __importDefault(require("./customer.routes"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const voxellance_routes_1 = __importDefault(require("./voxellance.routes"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/** Public no-auth probe — static 200 only */
router.get('/success', (_req, res) => {
    res.status(200).json({ success: true, message: 'Success' });
});
router.use('/health', health_routes_1.default);
router.use('/telegram', telegram_routes_1.default);
router.use('/api/auth', auth_routes_1.default);
router.use('/api/voxellance', voxellance_routes_1.default);
// Admin-only APIs
router.use('/api/reminders', auth_1.requireAdmin, reminder_routes_1.default);
router.use('/api/customers', auth_1.requireAdmin, customer_routes_1.default);
router.use('/api/system', auth_1.requireAdmin, system_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map