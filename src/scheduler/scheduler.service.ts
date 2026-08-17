import schedule, { Job } from 'node-schedule';
import { Reminder, ReminderStatus } from '../types';
import { ReminderRepository } from '../repositories/reminder.repository';
import { MessagingProvider } from '../providers/messaging.provider';
import { schedulerLogger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { resolveToUtcDate } from '../utils/datetime';
import { computeNextOccurrence } from '../utils/recurrence';
import { reminderActionKeyboard } from '../config/snooze-options';
import { formatReminderFireHtml } from '../utils/reminder-message';

/**
 * Dynamic scheduling via node-schedule.
 * One-shot jobs wait for Complete/Snooze after firing; recurring jobs advance to the next occurrence.
 */
export class SchedulerService {
  private readonly jobs = new Map<string, Job>();
  /** In-process guard against overlapping executeReminder for the same id. */
  private readonly executing = new Set<string>();

  constructor(
    private readonly reminderRepository: ReminderRepository,
    private readonly messagingProvider: MessagingProvider
  ) {}

  scheduleReminder(reminder: Reminder): void {
    let runAt: Date;
    try {
      runAt = resolveToUtcDate(reminder.datetime, reminder.timezone);
    } catch {
      schedulerLogger.error('Invalid reminder datetime', {
        id: reminder.id,
        datetime: reminder.datetime,
        timezone: reminder.timezone,
      });
      return;
    }

    if (Number.isNaN(runAt.getTime())) {
      schedulerLogger.error('Invalid reminder datetime', {
        id: reminder.id,
        datetime: reminder.datetime,
      });
      return;
    }

    if (runAt.getTime() <= Date.now()) {
      schedulerLogger.warn('Reminder datetime is in the past; executing immediately', {
        id: reminder.id,
        runAt: runAt.toISOString(),
      });
      void this.executeReminder(reminder.id);
      return;
    }

    this.cancelReminder(reminder.id);

    const job = schedule.scheduleJob(reminder.id, runAt, () => {
      void this.executeReminder(reminder.id);
    });

    if (!job) {
      schedulerLogger.error('Failed to create scheduled job', { id: reminder.id });
      return;
    }

    this.jobs.set(reminder.id, job);
    schedulerLogger.info('Reminder scheduled', {
      id: reminder.id,
      runAt: runAt.toISOString(),
      timezone: reminder.timezone,
      reason: reminder.reason,
      recurrence: reminder.recurrence?.kind,
    });
  }

  cancelReminder(id: string): boolean {
    let cancelled = false;

    const existing = this.jobs.get(id);
    if (existing) {
      existing.cancel();
      this.jobs.delete(id);
      cancelled = true;
    }

    // Cancel any named job left in node-schedule's global registry
    const named = schedule.scheduledJobs[id];
    if (named) {
      named.cancel();
      cancelled = true;
    }

    if (cancelled) {
      schedulerLogger.info('Reminder job cancelled', { id });
    }

    return cancelled;
  }

  async executeReminder(id: string): Promise<void> {
    if (this.executing.has(id)) {
      schedulerLogger.warn('Skipping duplicate in-process execution', { id });
      return;
    }
    this.executing.add(id);

    try {
      schedulerLogger.info('Executing reminder', { id });

      // Atomic claim across instances (Render multi-instance / race)
      const reminder = await this.reminderRepository.claimForExecution(id);
      if (!reminder) {
        schedulerLogger.warn('Reminder already claimed or not scheduled', { id });
        this.jobs.delete(id);
        return;
      }

      try {
        const sent = await this.messagingProvider.sendMessage({
          chatId: reminder.chatId,
          text: formatReminderFireHtml(reminder),
          parseMode: 'HTML',
          inlineKeyboard: reminderActionKeyboard(reminder.id),
        });

        if (sent.messageId) {
          await this.reminderRepository.update(id, {
            telegramMessageId: Number(sent.messageId),
          });
        }

        const rescheduled = await this.rescheduleIfRecurring(reminder);
        if (!rescheduled) {
          this.jobs.delete(id);
          schedulerLogger.info('Reminder sent; waiting for Complete/Snooze', {
            id,
            reason: reminder.reason,
          });
        }
      } catch (error) {
        await this.reminderRepository.updateStatus(id, ReminderStatus.FAILED);
        this.jobs.delete(id);
        schedulerLogger.error('Reminder execution failed', {
          id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      this.executing.delete(id);
    }
  }

  private async rescheduleIfRecurring(reminder: Reminder): Promise<boolean> {
    if (!reminder.recurrence) {
      return false;
    }

    const remainingAfter = (reminder.recurrence.remainingCount ?? Number.POSITIVE_INFINITY) - 1;
    if (remainingAfter <= 0) {
      return false;
    }

    const nextAt = computeNextOccurrence(reminder, new Date());
    if (!nextAt) {
      return false;
    }

    if (
      reminder.recurrence.endsAt &&
      nextAt.getTime() > new Date(reminder.recurrence.endsAt).getTime()
    ) {
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
      status: ReminderStatus.SCHEDULED,
      completedAt: undefined,
    });

    if (!updated) {
      return false;
    }

    this.jobs.delete(reminder.id);
    this.scheduleReminder(updated);
    schedulerLogger.info('Recurring reminder advanced', {
      id: reminder.id,
      nextAt: nextAt.toISOString(),
      remainingCount: recurrence.remainingCount,
    });
    return true;
  }

  async restoreScheduledJobs(): Promise<number> {
    const scheduled = await this.reminderRepository.findByStatuses([
      ReminderStatus.SCHEDULED,
      ReminderStatus.SNOOZED,
    ]);
    let restored = 0;

    for (const reminder of scheduled) {
      this.scheduleReminder(reminder);
      restored += 1;
    }

    schedulerLogger.info('Restored scheduled jobs from repository', { count: restored });
    return restored;
  }

  getActiveJobCount(): number {
    return this.jobs.size;
  }

  async cancelAndMarkCancelled(id: string): Promise<Reminder> {
    const reminder = await this.reminderRepository.findById(id);
    if (!reminder) {
      throw new NotFoundError('Reminder');
    }

    this.cancelReminder(id);
    const updated = await this.reminderRepository.updateStatus(id, ReminderStatus.CANCELLED);
    if (!updated) {
      throw new NotFoundError('Reminder');
    }

    return updated;
  }
}
