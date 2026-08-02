"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderController = exports.ReminderController = void 0;
const zod_1 = require("zod");
const container_1 = require("../config/container");
const response_1 = require("../utils/response");
const testReminderSchema = zod_1.z.object({
    chatId: zod_1.z.string().optional(),
    telegramUserId: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
    datetime: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    originalMessage: zod_1.z.string().optional(),
});
class ReminderController {
    async list(_req, res, next) {
        try {
            const reminders = await container_1.container.reminderService.getAll();
            (0, response_1.sendSuccess)(res, reminders);
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const reminder = await container_1.container.reminderService.getById(req.params.id);
            (0, response_1.sendSuccess)(res, reminder);
        }
        catch (error) {
            next(error);
        }
    }
    async remove(req, res, next) {
        try {
            await container_1.container.reminderService.delete(req.params.id);
            (0, response_1.sendSuccess)(res, null, 'Reminder deleted');
        }
        catch (error) {
            next(error);
        }
    }
    async cancel(req, res, next) {
        try {
            const reminder = await container_1.container.reminderService.cancel(req.params.id);
            (0, response_1.sendSuccess)(res, reminder, 'Reminder cancelled');
        }
        catch (error) {
            next(error);
        }
    }
    async stats(_req, res, next) {
        try {
            const stats = await container_1.container.reminderService.getStats();
            (0, response_1.sendSuccess)(res, stats);
        }
        catch (error) {
            next(error);
        }
    }
    async analytics(_req, res, next) {
        try {
            const analytics = await container_1.container.reminderService.getAnalytics();
            (0, response_1.sendSuccess)(res, analytics);
        }
        catch (error) {
            next(error);
        }
    }
    async createTest(req, res, next) {
        try {
            const body = testReminderSchema.parse(req.body ?? {});
            const reminder = await container_1.container.reminderService.createTestReminder(body);
            (0, response_1.sendSuccess)(res, reminder, 'Test reminder scheduled', 201);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReminderController = ReminderController;
exports.reminderController = new ReminderController();
//# sourceMappingURL=reminder.controller.js.map