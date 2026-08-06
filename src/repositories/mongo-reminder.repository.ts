import {

  CreateReminderInput,

  MessagingChannel,

  Reminder,

  ReminderAnalytics,

  ReminderRecurrence,

  ReminderStatus,

} from '../types';

import { ReminderDocument, ReminderModel } from '../db/models/reminder.model';

import { ReminderRepository } from './reminder.repository';



function toReminder(doc: ReminderDocument): Reminder {

  const recurrence = doc.recurrence

    ? ({

        kind: doc.recurrence.kind,

        summary: doc.recurrence.summary,

        ...(doc.recurrence.intervalMs !== undefined && doc.recurrence.intervalMs !== null

          ? { intervalMs: doc.recurrence.intervalMs }

          : {}),

        ...(doc.recurrence.weekdays?.length ? { weekdays: [...doc.recurrence.weekdays] } : {}),

        ...(doc.recurrence.month !== undefined && doc.recurrence.month !== null

          ? { month: doc.recurrence.month }

          : {}),

        ...(doc.recurrence.dayOfMonth !== undefined && doc.recurrence.dayOfMonth !== null

          ? { dayOfMonth: doc.recurrence.dayOfMonth }

          : {}),

        ...(doc.recurrence.hour !== undefined && doc.recurrence.hour !== null

          ? { hour: doc.recurrence.hour }

          : {}),

        ...(doc.recurrence.minute !== undefined && doc.recurrence.minute !== null

          ? { minute: doc.recurrence.minute }

          : {}),

        ...(doc.recurrence.endsAt ? { endsAt: doc.recurrence.endsAt } : {}),

        ...(doc.recurrence.remainingCount !== undefined && doc.recurrence.remainingCount !== null

          ? { remainingCount: doc.recurrence.remainingCount }

          : {}),

      } as ReminderRecurrence)

    : undefined;



  return {

    id: String(doc._id),

    ...(doc.customerId ? { customerId: String(doc.customerId) } : {}),

    telegramUserId: doc.telegramUserId,

    chatId: doc.chatId,

    originalMessage: doc.originalMessage,

    reason: doc.reason,

    datetime: doc.datetime,

    timezone: doc.timezone,

    status: doc.status as ReminderStatus,

    createdAt: doc.createdAt.toISOString(),

    updatedAt: doc.updatedAt.toISOString(),

    ...(doc.completedAt ? { completedAt: doc.completedAt } : {}),

    channel: doc.channel as MessagingChannel,

    ...(recurrence ? { recurrence } : {}),

  };

}



export class MongoReminderRepository implements ReminderRepository {

  async create(input: CreateReminderInput): Promise<Reminder> {

    const created = await ReminderModel.create({

      ...(input.customerId ? { customerId: input.customerId } : {}),

      telegramUserId: input.telegramUserId,

      chatId: input.chatId,

      originalMessage: input.originalMessage,

      reason: input.reason,

      datetime: input.datetime,

      timezone: input.timezone,

      status: ReminderStatus.SCHEDULED,

      channel: input.channel ?? 'telegram',

      ...(input.recurrence ? { recurrence: input.recurrence } : {}),

    });



    return toReminder(created);

  }



  async findById(id: string): Promise<Reminder | null> {

    const doc = await ReminderModel.findById(id).exec();

    return doc ? toReminder(doc) : null;

  }



  async findAll(): Promise<Reminder[]> {

    const docs = await ReminderModel.find().sort({ createdAt: -1 }).exec();

    return docs.map(toReminder);

  }



  async findByStatus(status: ReminderStatus): Promise<Reminder[]> {

    const docs = await ReminderModel.find({ status }).sort({ datetime: 1 }).exec();

    return docs.map(toReminder);

  }



  async findByTelegramUserId(telegramUserId: string): Promise<Reminder[]> {

    const docs = await ReminderModel.find({ telegramUserId }).sort({ datetime: 1 }).exec();

    return docs.map(toReminder);

  }



  async updateStatus(

    id: string,

    status: ReminderStatus,

    extra?: Partial<Pick<Reminder, 'completedAt'>>

  ): Promise<Reminder | null> {

    return this.update(id, { status, ...extra });

  }



  async update(id: string, patch: Partial<Reminder>): Promise<Reminder | null> {

    const { id: _ignore, ...rest } = patch;

    const doc = await ReminderModel.findByIdAndUpdate(

      id,

      { $set: rest },

      { new: true }

    ).exec();

    return doc ? toReminder(doc) : null;

  }



  async delete(id: string): Promise<boolean> {

    const result = await ReminderModel.findByIdAndDelete(id).exec();

    return Boolean(result);

  }



  async getStats(): Promise<Omit<import('../types').ReminderStats, 'customers'>> {

    const [total, scheduled, completed, cancelled, failed, today] = await Promise.all([

      ReminderModel.countDocuments(),

      ReminderModel.countDocuments({ status: ReminderStatus.SCHEDULED }),

      ReminderModel.countDocuments({ status: ReminderStatus.COMPLETED }),

      ReminderModel.countDocuments({ status: ReminderStatus.CANCELLED }),

      ReminderModel.countDocuments({ status: ReminderStatus.FAILED }),

      this.countToday(),

    ]);



    return { total, scheduled, completed, cancelled, failed, today };

  }



  async countCreatedSince(since: Date): Promise<number> {

    return ReminderModel.countDocuments({ createdAt: { $gte: since } });

  }



  async getAnalytics(): Promise<ReminderAnalytics> {

    const [completed, scheduled, cancelled, failed, perDay] = await Promise.all([

      ReminderModel.countDocuments({ status: ReminderStatus.COMPLETED }),

      ReminderModel.countDocuments({ status: ReminderStatus.SCHEDULED }),

      ReminderModel.countDocuments({ status: ReminderStatus.CANCELLED }),

      ReminderModel.countDocuments({ status: ReminderStatus.FAILED }),

      ReminderModel.aggregate<{ _id: string; count: number }>([

        {

          $group: {

            _id: {

              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },

            },

            count: { $sum: 1 },

          },

        },

        { $sort: { _id: 1 } },

      ]),

    ]);



    return {

      statusBreakdown: { completed, scheduled, cancelled, failed },

      remindersPerDay: perDay.map((row) => ({ date: row._id, count: row.count })),

    };

  }



  private async countToday(): Promise<number> {

    const start = new Date();

    start.setHours(0, 0, 0, 0);

    const end = new Date();

    end.setHours(23, 59, 59, 999);



    return ReminderModel.countDocuments({

      datetime: {

        $gte: start.toISOString(),

        $lte: end.toISOString(),

      },

    });

  }

}


