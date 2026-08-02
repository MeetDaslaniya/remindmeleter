import schedule, { Job } from 'node-schedule';

import { Reminder, ReminderStatus } from '../types';

import { ReminderRepository } from '../repositories/reminder.repository';

import { MessagingProvider } from '../providers/messaging.provider';

import { schedulerLogger } from '../utils/logger';

import { NotFoundError } from '../utils/errors';

import { resolveToUtcDate } from '../utils/datetime';

import { computeNextOccurrence } from '../utils/recurrence';



/**

 * Dynamic scheduling via node-schedule.

 * One-shot jobs complete after firing; recurring jobs advance to the next occurrence.

 */

export class SchedulerService {

  private readonly jobs = new Map<string, Job>();



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

      schedulerLogger.error('Invalid reminder datetime', { id: reminder.id, datetime: reminder.datetime });

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

    const existing = this.jobs.get(id);

    if (!existing) {

      return false;

    }



    existing.cancel();

    this.jobs.delete(id);

    schedulerLogger.info('Reminder job cancelled', { id });

    return true;

  }



  async executeReminder(id: string): Promise<void> {

    schedulerLogger.info('Executing reminder', { id });



    const reminder = await this.reminderRepository.findById(id);

    if (!reminder) {

      schedulerLogger.warn('Reminder not found during execution', { id });

      this.jobs.delete(id);

      return;

    }



    if (reminder.status !== ReminderStatus.SCHEDULED) {

      schedulerLogger.warn('Skipping non-scheduled reminder', {

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

        await this.reminderRepository.updateStatus(id, ReminderStatus.COMPLETED, {

          completedAt: new Date().toISOString(),

        });

        this.jobs.delete(id);

        schedulerLogger.info('Reminder completed', { id, reason: reminder.reason });

      }

    } catch (error) {

      await this.reminderRepository.updateStatus(id, ReminderStatus.FAILED);

      this.jobs.delete(id);

      schedulerLogger.error('Reminder execution failed', {

        id,

        error: error instanceof Error ? error.message : String(error),

      });

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

      ...(Number.isFinite(remainingAfter)

        ? { remainingCount: remainingAfter }

        : {}),

    };



    const updated = await this.reminderRepository.update(reminder.id, {

      datetime: nextAt.toISOString(),

      recurrence,

      status: ReminderStatus.SCHEDULED,

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

    const scheduled = await this.reminderRepository.findByStatus(ReminderStatus.SCHEDULED);

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


