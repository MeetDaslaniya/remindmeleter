"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_schedule_1 = __importDefault(require("node-schedule"));
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const datetime_1 = require("../utils/datetime");
const recurrence_1 = require("../utils/recurrence");
/**

 * Dynamic scheduling via node-schedule.

 * One-shot jobs complete after firing; recurring jobs advance to the next occurrence.

 */
class SchedulerService {
    reminderRepository;
    messagingProvider;
    jobs = new Map();
    constructor(reminderRepository, messagingProvider) {
        this.reminderRepository = reminderRepository;
        this.messagingProvider = messagingProvider;
    }
    scheduleReminder(reminder) {
        let runAt;
        try {
            runAt = (0, datetime_1.resolveToUtcDate)(reminder.datetime, reminder.timezone);
        }
        catch {
            logger_1.schedulerLogger.error('Invalid reminder datetime', {
                id: reminder.id,
                datetime: reminder.datetime,
                timezone: reminder.timezone,
            });
            return;
        }
        if (Number.isNaN(runAt.getTime())) {
            logger_1.schedulerLogger.error('Invalid reminder datetime', { id: reminder.id, datetime: reminder.datetime });
            return;
        }
        if (runAt.getTime() <= Date.now()) {
            logger_1.schedulerLogger.warn('Reminder datetime is in the past; executing immediately', {
                id: reminder.id,
                runAt: runAt.toISOString(),
            });
            void this.executeReminder(reminder.id);
            return;
        }
        this.cancelReminder(reminder.id);
        const job = node_schedule_1.default.scheduleJob(reminder.id, runAt, () => {
            void this.executeReminder(reminder.id);
        });
        if (!job) {
            logger_1.schedulerLogger.error('Failed to create scheduled job', { id: reminder.id });
            return;
        }
        this.jobs.set(reminder.id, job);
        logger_1.schedulerLogger.info('Reminder scheduled', {
            id: reminder.id,
            runAt: runAt.toISOString(),
            timezone: reminder.timezone,
            reason: reminder.reason,
            recurrence: reminder.recurrence?.kind,
        });
    }
    cancelReminder(id) {
        const existing = this.jobs.get(id);
        if (!existing) {
            return false;
        }
        existing.cancel();
        this.jobs.delete(id);
        logger_1.schedulerLogger.info('Reminder job cancelled', { id });
        return true;
    }
    async executeReminder(id) {
        logger_1.schedulerLogger.info('Executing reminder', { id });
        const reminder = await this.reminderRepository.findById(id);
        if (!reminder) {
            logger_1.schedulerLogger.warn('Reminder not found during execution', { id });
            this.jobs.delete(id);
            return;
        }
        if (reminder.status !== types_1.ReminderStatus.SCHEDULED) {
            logger_1.schedulerLogger.warn('Skipping non-scheduled reminder', {
                id,
                status: reminder.status,
            });
            this.jobs.delete(id);
            return;
        }
        try {
            const text = [
                '<b>⏰ Reminder</b>',
                '',
                reminder.reason,
                ...(reminder.recurrence ? ['', `<i>${reminder.recurrence.summary}</i>`] : []),
            ].join('\n');
            await this.messagingProvider.sendMessage({
                chatId: reminder.chatId,
                text,
                parseMode: 'HTML',
            });
            const rescheduled = await this.rescheduleIfRecurring(reminder);
            if (!rescheduled) {
                await this.reminderRepository.updateStatus(id, types_1.ReminderStatus.COMPLETED, {
                    completedAt: new Date().toISOString(),
                });
                this.jobs.delete(id);
                logger_1.schedulerLogger.info('Reminder completed', { id, reason: reminder.reason });
            }
        }
        catch (error) {
            await this.reminderRepository.updateStatus(id, types_1.ReminderStatus.FAILED);
            this.jobs.delete(id);
            logger_1.schedulerLogger.error('Reminder execution failed', {
                id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async rescheduleIfRecurring(reminder) {
        if (!reminder.recurrence) {
            return false;
        }
        const remainingAfter = (reminder.recurrence.remainingCount ?? Number.POSITIVE_INFINITY) - 1;
        if (remainingAfter <= 0) {
            return false;
        }
        const nextAt = (0, recurrence_1.computeNextOccurrence)(reminder, new Date());
        if (!nextAt) {
            return false;
        }
        if (reminder.recurrence.endsAt &&
            nextAt.getTime() > new Date(reminder.recurrence.endsAt).getTime()) {
            return false;
        }
        const recurrence = {
            ...reminder.recurrence,
            ...(Number.isFinite(remainingAfter)
                ? { remainingCount: remainingAfter }
                : {}),
        };
        const updated = await this.reminderRepository.update(reminder.id, {
            datetime: nextAt.toISOString(),
            recurrence,
            status: types_1.ReminderStatus.SCHEDULED,
        });
        if (!updated) {
            return false;
        }
        this.jobs.delete(reminder.id);
        this.scheduleReminder(updated);
        logger_1.schedulerLogger.info('Recurring reminder advanced', {
            id: reminder.id,
            nextAt: nextAt.toISOString(),
            remainingCount: recurrence.remainingCount,
        });
        return true;
    }
    async restoreScheduledJobs() {
        const scheduled = await this.reminderRepository.findByStatus(types_1.ReminderStatus.SCHEDULED);
        let restored = 0;
        for (const reminder of scheduled) {
            this.scheduleReminder(reminder);
            restored += 1;
        }
        logger_1.schedulerLogger.info('Restored scheduled jobs from repository', { count: restored });
        return restored;
    }
    getActiveJobCount() {
        return this.jobs.size;
    }
    async cancelAndMarkCancelled(id) {
        const reminder = await this.reminderRepository.findById(id);
        if (!reminder) {
            throw new errors_1.NotFoundError('Reminder');
        }
        this.cancelReminder(id);
        const updated = await this.reminderRepository.updateStatus(id, types_1.ReminderStatus.CANCELLED);
        if (!updated) {
            throw new errors_1.NotFoundError('Reminder');
        }
        return updated;
    }
}
exports.SchedulerService = SchedulerService;
//# sourceMappingURL=scheduler.service.js.map