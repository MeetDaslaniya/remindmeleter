"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const datetime_1 = require("../utils/datetime");
class ReminderService {
    reminderRepository;
    schedulerService;
    constructor(reminderRepository, schedulerService) {
        this.reminderRepository = reminderRepository;
        this.schedulerService = schedulerService;
    }
    async createReminder(input) {
        let runAt;
        try {
            runAt = (0, datetime_1.resolveToUtcDate)(input.datetime, input.timezone);
        }
        catch {
            throw new errors_1.ValidationError('Invalid reminder datetime');
        }
        if (Number.isNaN(runAt.getTime())) {
            throw new errors_1.ValidationError('Invalid reminder datetime');
        }
        const reminder = await this.reminderRepository.create({
            ...input,
            datetime: runAt.toISOString(),
        });
        this.schedulerService.scheduleReminder(reminder);
        logger_1.logger.info('Reminder created', {
            id: reminder.id,
            datetime: reminder.datetime,
            timezone: reminder.timezone,
            reason: reminder.reason,
            recurrence: reminder.recurrence?.kind,
        });
        return reminder;
    }
    async getAll() {
        return this.reminderRepository.findAll();
    }
    async getById(id) {
        const reminder = await this.reminderRepository.findById(id);
        if (!reminder) {
            throw new errors_1.NotFoundError('Reminder');
        }
        return reminder;
    }
    async delete(id) {
        const reminder = await this.reminderRepository.findById(id);
        if (!reminder) {
            throw new errors_1.NotFoundError('Reminder');
        }
        this.schedulerService.cancelReminder(id);
        await this.reminderRepository.delete(id);
        logger_1.logger.info('Reminder deleted', { id });
    }
    async cancel(id) {
        return this.schedulerService.cancelAndMarkCancelled(id);
    }
    async getStats() {
        return this.reminderRepository.getStats();
    }
    async getAnalytics() {
        return this.reminderRepository.getAnalytics();
    }
    async createTestReminder(overrides) {
        const runAt = new Date(Date.now() + 60_000);
        return this.createReminder({
            telegramUserId: overrides?.telegramUserId ?? 'test-user',
            chatId: overrides?.chatId ?? 'test-chat',
            originalMessage: overrides?.originalMessage ?? 'Test reminder in 1 minute',
            reason: overrides?.reason ?? 'Test reminder',
            datetime: overrides?.datetime ?? runAt.toISOString().slice(0, 19),
            timezone: overrides?.timezone ?? 'Asia/Kolkata',
            channel: overrides?.channel ?? 'telegram',
        });
    }
}
exports.ReminderService = ReminderService;
//# sourceMappingURL=reminder.service.js.map