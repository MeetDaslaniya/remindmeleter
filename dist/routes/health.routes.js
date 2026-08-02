"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_controller_1 = require("../controllers/health.controller");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => {
    void health_controller_1.healthController.getHealth(req, res, next);
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map