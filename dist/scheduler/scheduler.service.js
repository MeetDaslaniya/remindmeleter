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
const snooze_options_1 = require("../config/snooze-options");
const reminder_message_1 = require("../utils/reminder-message");
/**
 * Dynamic scheduling via node-schedule.
 * One-shot jobs wait for Complete/Snooze after firing; recurring jobs advance to the next occurrence.
 */
class SchedulerService {
    reminderRepository;
    messagingProvider;
    jobs = new Map();
    /** In-process guard against overlapping executeReminder for the same id. */
    executing = new Set();
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
            logger_1.schedulerLogger.error('Invalid reminder datetime', {
                id: reminder.id,
                datetime: reminder.datetime,
            });
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
        let cancelled = false;
        const existing = this.jobs.get(id);
        if (existing) {
            existing.cancel();
            this.jobs.delete(id);
            cancelled = true;
        }
        // Cancel any named job left in node-schedule's global registry
        const named = node_schedule_1.default.scheduledJobs[id];
        if (named) {
            named.cancel();
            cancelled = true;
        }
        if (cancelled) {
            logger_1.schedulerLogger.info('Reminder job cancelled', { id });
        }
        return cancelled;
    }
    async executeReminder(id) {
        if (this.executing.has(id)) {
            logger_1.schedulerLogger.warn('Skipping duplicate in-process execution', { id });
            return;
        }
        this.executing.add(id);
        try {
            logger_1.schedulerLogger.info('Executing reminder', { id });
            // Atomic claim across instances (Render multi-instance / race)
            const reminder = await this.reminderRepository.claimForExecution(id);
            if (!reminder) {
                logger_1.schedulerLogger.warn('Reminder already claimed or not scheduled', { id });
                this.jobs.delete(id);
                return;
            }
            try {
                const sent = await this.messagingProvider.sendMessage({
                    chatId: reminder.chatId,
                    text: (0, reminder_message_1.formatReminderFireHtml)(reminder),
                    parseMode: 'HTML',
                    inlineKeyboard: (0, snooze_options_1.reminderActionKeyboard)(reminder.id),
                });
                if (sent.messageId) {
                    await this.reminderRepository.update(id, {
                        telegramMessageId: Number(sent.messageId),
                    });
                }
                const rescheduled = await this.rescheduleIfRecurring(reminder);
                if (!rescheduled) {
                    this.jobs.delete(id);
                    logger_1.schedulerLogger.info('Reminder sent; waiting for Complete/Snooze', {
                        id,
                        reason: reminder.reason,
                    });
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
        finally {
            this.executing.delete(id);
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
            ...(Number.isFinite(remainingAfter) ? { remainingCount: remainingAfter } : {}),
            ...(reminder.recurrence.totalCount !== undefined
                ? { totalCount: reminder.recurrence.totalCount }
                : {}),
        };
        const updated = await this.reminderRepository.update(reminder.id, {
            datetime: nextAt.toISOString(),
            recurrence,
            status: types_1.ReminderStatus.SCHEDULED,
            completedAt: undefined,
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
        const scheduled = await this.reminderRepository.findByStatuses([
            types_1.ReminderStatus.SCHEDULED,
            types_1.ReminderStatus.SNOOZED,
        ]);
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