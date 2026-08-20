"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_controller_1 = require("../controllers/system.controller");
const router = (0, express_1.Router)();
router.get('/status', (req, res, next) => {
    void system_controller_1.systemController.getStatus(req, res, next);
});
router.post('/webhook/sync', (req, res, next) => {
    void system_controller_1.systemController.syncWebhook(req, res, next);
});
exports.default = router;
//# sourceMappingURL=system.routes.js.map