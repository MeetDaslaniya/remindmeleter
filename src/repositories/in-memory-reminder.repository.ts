import { v4 as uuidv4 } from 'uuid';
import {
  ACTIVE_REMINDER_STATUSES,
  CreateReminderInput,
  Reminder,
  ReminderAnalytics,
  ReminderStats,
  ReminderStatus,
} from '../types';
import { ReminderRepository, ReminderSnoozePatch } from './reminder.repository';

const ACTIONABLE_STATUSES = new Set<ReminderStatus>([
  ReminderStatus.SCHEDULED,
  ReminderStatus.SENT,
  ReminderStatus.SNOOZED,
]);

export class InMemoryReminderRepository implements ReminderRepository {
  private readonly reminders = new Map<string, Reminder>();

  async create(input: CreateReminderInput): Promise<Reminder> {
    const now = new Date().toISOString();
    const reminder: Reminder = {
      id: uuidv4(),
      telegramUserId: input.telegramUserId,
      chatId: input.chatId,
      originalMessage: input.originalMessage,
      reason: input.reason,
      datetime: input.datetime,
      timezone: input.timezone,
      status: ReminderStatus.SCHEDULED,
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

  async findById(id: string): Promise<Reminder | null> {
    return this.reminders.get(id) ?? null;
  }

  async findOwnedById(id: string, telegramUserId: string): Promise<Reminder | null> {
    const reminder = this.reminders.get(id);
    if (!reminder || reminder.telegramUserId !== telegramUserId) {
      return null;
    }
    return reminder;
  }

  async findAll(): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByStatus(status: ReminderStatus): Promise<Reminder[]> {
    const all = await this.findAll();
    return all.filter((r) => r.status === status);
  }

  async findByStatuses(statuses: ReminderStatus[]): Promise<Reminder[]> {
    const allowed = new Set(statuses);
    const all = await this.findAll();
    return all.filter((r) => allowed.has(r.status));
  }

  async findByTelegramUserId(telegramUserId: string): Promise<Reminder[]> {
    const all = await this.findAll();
    return all
      .filter((r) => r.telegramUserId === telegramUserId)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }

  async updateStatus(
    id: string,
    status: ReminderStatus,
    extra?: Partial<Pick<Reminder, 'completedAt'>>
  ): Promise<Reminder | null> {
    return this.update(id, { status, ...extra });
  }

  async claimForExecution(id: string): Promise<Reminder | null> {
    const existing = this.reminders.get(id);
    if (
      !existing ||
      (existing.status !== ReminderStatus.SCHEDULED && existing.status !== ReminderStatus.SNOOZED)
    ) {
      return null;
    }

    const snapshot: Reminder = { ...existing };
    this.reminders.set(id, {
      ...existing,
      status: ReminderStatus.SENT,
      sentAt: new Date().toISOString(),
      completedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
    return snapshot;
  }

  async completeOwned(
    id: string,
    telegramUserId: string,
    completedAt: string
  ): Promise<Reminder | null> {
    const existing = this.reminders.get(id);
    if (!existing || existing.telegramUserId !== telegramUserId) {
      return null;
    }
    if (!ACTIONABLE_STATUSES.has(existing.status)) {
      return null;
    }

    const updated: Reminder = {
      ...existing,
      status: ReminderStatus.COMPLETED,
      completedAt,
      updatedAt: new Date().toISOString(),
    };
    this.reminders.set(id, updated);
    return updated;
  }

  async snoozeOwned(
    id: string,
    telegramUserId: string,
    patch: ReminderSnoozePatch
  ): Promise<Reminder | null> {
    const existing = this.reminders.get(id);
    if (!existing || existing.telegramUserId !== telegramUserId) {
      return null;
    }
    if (!ACTIONABLE_STATUSES.has(existing.status)) {
      return null;
    }

    const snoozedThisOccurrence =
      existing.snoozedAt !== undefined &&
      existing.sentAt !== undefined &&
      existing.snoozedAt >= existing.sentAt;
    if (snoozedThisOccurrence) {
      return null;
    }

    const updated: Reminder = {
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

  async update(id: string, patch: Partial<Reminder>): Promise<Reminder | null> {
    const existing = this.reminders.get(id);
    if (!existing) {
      return null;
    }

    const updated: Reminder = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    this.reminders.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.reminders.delete(id);
  }

  async getStats(): Promise<Omit<ReminderStats, 'customers'>> {
    const all = await this.findAll();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return {
      total: all.length,
      scheduled: all.filter((r) => ACTIVE_REMINDER_STATUSES.includes(r.status)).length,
      completed: all.filter((r) => r.status === ReminderStatus.COMPLETED).length,
      cancelled: all.filter((r) => r.status === ReminderStatus.CANCELLED).length,
      failed: all.filter((r) => r.status === ReminderStatus.FAILED).length,
      today: all.filter((r) => {
        const dt = new Date(r.datetime).getTime();
        return dt >= todayStart.getTime() && dt <= todayEnd.getTime();
      }).length,
    };
  }

  async countCreatedSince(since: Date): Promise<number> {
    const all = await this.findAll();
    const sinceMs = since.getTime();
    return all.filter((r) => new Date(r.createdAt).getTime() >= sinceMs).length;
  }

  async getAnalytics(): Promise<ReminderAnalytics> {
    const all = await this.findAll();
    const dayMap = new Map<string, number>();

    for (const reminder of all) {
      const dateKey = reminder.createdAt.slice(0, 10);
      dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + 1);
    }

    const remindersPerDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      statusBreakdown: {
        completed: all.filter((r) => r.status === ReminderStatus.COMPLETED).length,
        scheduled: all.filter((r) => ACTIVE_REMINDER_STATUSES.includes(r.status)).length,
        cancelled: all.filter((r) => r.status === ReminderStatus.CANCELLED).length,
        failed: all.filter((r) => r.status === ReminderStatus.FAILED).length,
      },
      remindersPerDay,
    };
  }
}
