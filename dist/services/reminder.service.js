"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const datetime_1 = require("../utils/datetime");
class ReminderService {
    reminderRepository;
    schedulerService;
    customerService;
    constructor(reminderRepository, schedulerService, customerService) {
        this.reminderRepository = reminderRepository;
        this.schedulerService = schedulerService;
        this.customerService = customerService;
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
        if (input.customerId && this.customerService) {
            await this.customerService.incrementReminderCount(input.customerId);
        }
        logger_1.logger.info('Reminder created', {
            id: reminder.id,
            customerId: reminder.customerId,
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
    async getScheduledForUser(telegramUserId) {
        const all = await this.reminderRepository.findByTelegramUserId(telegramUserId);
        return all.filter((r) => types_1.ACTIVE_REMINDER_STATUSES.includes(r.status));
    }
    async cancelForUser(id, telegramUserId) {
        const reminder = await this.reminderRepository.findById(id);
        if (!reminder || reminder.telegramUserId !== telegramUserId) {
            throw new errors_1.NotFoundError('Reminder');
        }
        return this.schedulerService.cancelAndMarkCancelled(id);
    }
    async cancelAllForUser(telegramUserId) {
        const scheduled = await this.getScheduledForUser(telegramUserId);
        for (const reminder of scheduled) {
            await this.schedulerService.cancelAndMarkCancelled(reminder.id);
        }
        return scheduled.length;
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
        const stats = await this.reminderRepository.getStats();
        const customers = this.customerService
            ? (await this.customerService.getStats()).total
            : 0;
        return { ...stats, customers };
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
            customerId: overrides?.customerId,
        });
    }
}
exports.ReminderService = ReminderService;
//# sourceMappingURL=reminder.service.js.map