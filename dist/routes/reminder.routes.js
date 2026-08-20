"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const reminder_controller_1 = require("../controllers/reminder.controller");
const validate_1 = require("../middleware/validate");
const idParamsSchema = zod_1.z.object({
    // MongoDB ObjectId (24 hex) or legacy UUID from in-memory era
    id: zod_1.z
        .string()
        .min(1)
        .refine((value) => /^[a-f\d]{24}$/i.test(value) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), { message: 'Invalid reminder id' }),
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