import { v4 as uuidv4 } from 'uuid';
import {
  CreateReminderInput,
  Reminder,
  ReminderAnalytics,
  ReminderStats,
  ReminderStatus,
} from '../types';
import { ReminderRepository } from './reminder.repository';

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

  async findAll(): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByStatus(status: ReminderStatus): Promise<Reminder[]> {
    const all = await this.findAll();
    return all.filter((r) => r.status === status);
  }

  async findByTelegramUserId(telegramUserId: string): Promise<Reminder[]> {
    const all = await this.findAll();
    return all
      .filter((r) => r.telegramUserId === telegramUserId)
      .sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
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
    if (!existing || existing.status !== ReminderStatus.SCHEDULED) {
      return null;
    }

    const snapshot: Reminder = { ...existing };
    this.reminders.set(id, {
      ...existing,
      status: ReminderStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return snapshot;
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
      scheduled: all.filter((r) => r.status === ReminderStatus.SCHEDULED).length,
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
        scheduled: all.filter((r) => r.status === ReminderStatus.SCHEDULED).length,
        cancelled: all.filter((r) => r.status === ReminderStatus.CANCELLED).length,
        failed: all.filter((r) => r.status === ReminderStatus.FAILED).length,
      },
      remindersPerDay,
    };
  }
}
