"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryReminderRepository = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
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
            channel: input.channel ?? 'telegram',
            ...(input.recurrence ? { recurrence: input.recurrence } : {}),
        };
        this.reminders.set(reminder.id, reminder);
        return reminder;
    }
    async findById(id) {
        return this.reminders.get(id) ?? null;
    }
    async findAll() {
        return Array.from(this.reminders.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findByStatus(status) {
        const all = await this.findAll();
        return all.filter((r) => r.status === status);
    }
    async updateStatus(id, status, extra) {
        return this.update(id, { status, ...extra });
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
            scheduled: all.filter((r) => r.status === types_1.ReminderStatus.SCHEDULED).length,
            completed: all.filter((r) => r.status === types_1.ReminderStatus.COMPLETED).length,
            cancelled: all.filter((r) => r.status === types_1.ReminderStatus.CANCELLED).length,
            failed: all.filter((r) => r.status === types_1.ReminderStatus.FAILED).length,
            today: all.filter((r) => {
                const dt = new Date(r.datetime).getTime();
                return dt >= todayStart.getTime() && dt <= todayEnd.getTime();
            }).length,
        };
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
                scheduled: all.filter((r) => r.status === types_1.ReminderStatus.SCHEDULED).length,
                cancelled: all.filter((r) => r.status === types_1.ReminderStatus.CANCELLED).length,
                failed: all.filter((r) => r.status === types_1.ReminderStatus.FAILED).length,
            },
            remindersPerDay,
        };
    }
}
exports.InMemoryReminderRepository = InMemoryReminderRepository;
//# sourceMappingURL=in-memory-reminder.repository.js.map