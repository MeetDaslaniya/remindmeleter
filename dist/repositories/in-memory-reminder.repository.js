"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryReminderRepository = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
const ACTIONABLE_STATUSES = new Set([
    types_1.ReminderStatus.SCHEDULED,
    types_1.ReminderStatus.SENT,
    types_1.ReminderStatus.SNOOZED,
]);
class InMemoryReminderRepository {
    reminders = new Map();
    async create(input) {
        const now = new Date().toISOString();
        const reminder = {
            id: (0, uuid_1.v4)(),
            telegramUserId: input.telegramUserId,
            chatId: input.chatId,
            originalMessage: input.originalMessage,
            reason: input.reason,
            datetime: input.datetime,
            timezone: input.timezone,
            status: types_1.ReminderStatus.SCHEDULED,
            createdAt: now,
            updatedAt: now,
            snoozeCount: 0,
            channel: input.channel ?? 'telegram',
            ...(input.recurrence ? { recurrence: input.recurrence } : {}),
            ...(input.customerId ? { customerId: input.customerId } : {}),
        };
        this.reminders.set(reminder.id, reminder);
        return reminder;
    }
    async findById(id) {
        return this.reminders.get(id) ?? null;
    }
    async findOwnedById(id, telegramUserId) {
        const reminder = this.reminders.get(id);
        if (!reminder || reminder.telegramUserId !== telegramUserId) {
            return null;
        }
        return reminder;
    }
    async findAll() {
        return Array.from(this.reminders.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findByStatus(status) {
        const all = await this.findAll();
        return all.filter((r) => r.status === status);
    }
    async findByStatuses(statuses) {
        const allowed = new Set(statuses);
        const all = await this.findAll();
        return all.filter((r) => allowed.has(r.status));
    }
    async findByTelegramUserId(telegramUserId) {
        const all = await this.findAll();
        return all
            .filter((r) => r.telegramUserId === telegramUserId)
            .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    }
    async updateStatus(id, status, extra) {
        return this.update(id, { status, ...extra });
    }
    async claimForExecution(id) {
        const existing = this.reminders.get(id);
        if (!existing ||
            (existing.status !== types_1.ReminderStatus.SCHEDULED && existing.status !== types_1.ReminderStatus.SNOOZED)) {
            return null;
        }
        const snapshot = { ...existing };
        this.reminders.set(id, {
            ...existing,
            status: types_1.ReminderStatus.SENT,
            sentAt: new Date().toISOString(),
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
        });
        return snapshot;
    }
    async completeOwned(id, telegramUserId, completedAt) {
        const existing = this.reminders.get(id);
        if (!existing || existing.telegramUserId !== telegramUserId) {
            return null;
        }
        if (!ACTIONABLE_STATUSES.has(existing.status)) {
            return null;
        }
        const updated = {
            ...existing,
            status: types_1.ReminderStatus.COMPLETED,
            completedAt,
            updatedAt: new Date().toISOString(),
        };
        this.reminders.set(id, updated);
        return updated;
    }
    async snoozeOwned(id, telegramUserId, patch) {
        const existing = this.reminders.get(id);
        if (!existing || existing.telegramUserId !== telegramUserId) {
            return null;
        }
        if (!ACTIONABLE_STATUSES.has(existing.status)) {
            return null;
        }
        const snoozedThisOccurrence = existing.snoozedAt !== undefined &&
            existing.sentAt !== undefined &&
            existing.snoozedAt >= existing.sentAt;
        if (snoozedThisOccurrence) {
            return null;
        }
        const updated = {
            ...existing,
            status: patch.status,
            datetime: patch.datetime,
            snoozedAt: patch.snoozedAt,
            lastSnoozeDuration: patch.lastSnoozeDuration,
            snoozeCount: (existing.snoozeCount ?? 0) + 1,
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
        };
        this.reminders.set(id, updated);
        return updated;
    }
    async update(id, patch) {
        const existing = this.reminders.get(id);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...patch,
            id: existing.id,
            updatedAt: new Date().toISOString(),
        };
        this.reminders.set(id, updated);
        return updated;
    }
    async delete(id) {
        return this.reminders.delete(id);
    }
    async getStats() {
        const all = await this.findAll();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        return {
            total: all.length,
            scheduled: all.filter((r) => types_1.ACTIVE_REMINDER_STATUSES.includes(r.status)).length,
            completed: all.filter((r) => r.status === types_1.ReminderStatus.COMPLETED).length,
            cancelled: all.filter((r) => r.status === types_1.ReminderStatus.CANCELLED).length,
            failed: all.filter((r) => r.status === types_1.ReminderStatus.FAILED).length,
            today: all.filter((r) => {
                const dt = new Date(r.datetime).getTime();
                return dt >= todayStart.getTime() && dt <= todayEnd.getTime();
            }).length,
        };
    }
    async countCreatedSince(since) {
        const all = await this.findAll();
        const sinceMs = since.getTime();
        return all.filter((r) => new Date(r.createdAt).getTime() >= sinceMs).length;
    }
    async getAnalytics() {
        const all = await this.findAll();
        const dayMap = new Map();
        for (const reminder of all) {
            const dateKey = reminder.createdAt.slice(0, 10);
            dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + 1);
        }
        const remindersPerDay = Array.from(dayMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return {
            statusBreakdown: {
                completed: all.filter((r) => r.status === types_1.ReminderStatus.COMPLETED).length,
                scheduled: all.filter((r) => types_1.ACTIVE_REMINDER_STATUSES.includes(r.status)).length,
                cancelled: all.filter((r) => r.status === types_1.ReminderStatus.CANCELLED).length,
                failed: all.filter((r) => r.status === types_1.ReminderStatus.FAILED).length,
            },
            remindersPerDay,
        };
    }
}
exports.InMemoryReminderRepository = InMemoryReminderRepository;
//# sourceMappingURL=in-memory-reminder.repository.js.map