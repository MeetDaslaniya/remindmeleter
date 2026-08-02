"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const reminder_controller_1 = require("../controllers/reminder.controller");
const validate_1 = require("../middleware/validate");
const idParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => {
    void reminder_controller_1.reminderController.list(req, res, next);
});
router.get('/stats', (req, res, next) => {
    void reminder_controller_1.reminderController.stats(req, res, next);
});
router.get('/analytics', (req, res, next) => {
    void reminder_controller_1.reminderController.analytics(req, res, next);
});
router.post('/test', (req, res, next) => {
    void reminder_controller_1.reminderController.createTest(req, res, next);
});
router.get('/:id', (0, validate_1.validateRequest)(idParamsSchema, 'params'), (req, res, next) => {
    void reminder_controller_1.reminderController.getById(req, res, next);
});
router.delete('/:id', (0, validate_1.validateRequest)(idParamsSchema, 'params'), (req, res, next) => {
    void reminder_controller_1.reminderController.remove(req, res, next);
});
router.post('/:id/cancel', (0, validate_1.validateRequest)(idParamsSchema, 'params'), (req, res, next) => {
    void reminder_controller_1.reminderController.cancel(req, res, next);
});
exports.default = router;
//# sourceMappingURL=reminder.routes.js.map