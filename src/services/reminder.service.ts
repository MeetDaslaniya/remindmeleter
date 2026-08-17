import { ACTIVE_REMINDER_STATUSES, CreateReminderInput, Reminder, ReminderAnalytics, ReminderStats } from '../types';

import { ReminderRepository } from '../repositories/reminder.repository';

import { SchedulerService } from '../scheduler/scheduler.service';

import { CustomerService } from './customer.service';

import { NotFoundError, ValidationError } from '../utils/errors';

import { logger } from '../utils/logger';

import { resolveToUtcDate } from '../utils/datetime';



export class ReminderService {

  constructor(

    private readonly reminderRepository: ReminderRepository,

    private readonly schedulerService: SchedulerService,

    private readonly customerService?: CustomerService

  ) {}



  async createReminder(input: CreateReminderInput): Promise<Reminder> {

    let runAt: Date;

    try {

      runAt = resolveToUtcDate(input.datetime, input.timezone);

    } catch {

      throw new ValidationError('Invalid reminder datetime');

    }



    if (Number.isNaN(runAt.getTime())) {

      throw new ValidationError('Invalid reminder datetime');

    }



    const reminder = await this.reminderRepository.create({

      ...input,

      datetime: runAt.toISOString(),

    });

    this.schedulerService.scheduleReminder(reminder);



    if (input.customerId && this.customerService) {

      await this.customerService.incrementReminderCount(input.customerId);

    }



    logger.info('Reminder created', {

      id: reminder.id,

      customerId: reminder.customerId,

      datetime: reminder.datetime,

      timezone: reminder.timezone,

      reason: reminder.reason,

      recurrence: reminder.recurrence?.kind,

    });



    return reminder;

  }



  async getAll(): Promise<Reminder[]> {

    return this.reminderRepository.findAll();

  }



  async getById(id: string): Promise<Reminder> {

    const reminder = await this.reminderRepository.findById(id);

    if (!reminder) {

      throw new NotFoundError('Reminder');

    }

    return reminder;

  }



  async getScheduledForUser(telegramUserId: string): Promise<Reminder[]> {

    const all = await this.reminderRepository.findByTelegramUserId(telegramUserId);

    return all.filter((r) => ACTIVE_REMINDER_STATUSES.includes(r.status));

  }



  async cancelForUser(id: string, telegramUserId: string): Promise<Reminder> {

    const reminder = await this.reminderRepository.findById(id);

    if (!reminder || reminder.telegramUserId !== telegramUserId) {

      throw new NotFoundError('Reminder');

    }

    return this.schedulerService.cancelAndMarkCancelled(id);

  }



  async cancelAllForUser(telegramUserId: string): Promise<number> {

    const scheduled = await this.getScheduledForUser(telegramUserId);

    for (const reminder of scheduled) {

      await this.schedulerService.cancelAndMarkCancelled(reminder.id);

    }

    return scheduled.length;

  }



  async delete(id: string): Promise<void> {

    const reminder = await this.reminderRepository.findById(id);

    if (!reminder) {

      throw new NotFoundError('Reminder');

    }



    this.schedulerService.cancelReminder(id);

    await this.reminderRepository.delete(id);

    logger.info('Reminder deleted', { id });

  }



  async cancel(id: string): Promise<Reminder> {

    return this.schedulerService.cancelAndMarkCancelled(id);

  }



  async getStats(): Promise<ReminderStats> {

    const stats = await this.reminderRepository.getStats();

    const customers = this.customerService

      ? (await this.customerService.getStats()).total

      : 0;

    return { ...stats, customers };

  }



  async getAnalytics(): Promise<ReminderAnalytics> {

    return this.reminderRepository.getAnalytics();

  }



  async createTestReminder(overrides?: Partial<CreateReminderInput>): Promise<Reminder> {

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


