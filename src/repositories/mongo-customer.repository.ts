import { Customer, CustomerStats, MessagingChannel, UpsertCustomerInput } from '../types';

import { CustomerDocument, CustomerModel } from '../db/models/customer.model';

import { CustomerRepository } from './customer.repository';

import { config } from '../config';



function toCustomer(doc: CustomerDocument): Customer {

  return {

    id: String(doc._id),

    telegramUserId: doc.telegramUserId,

    chatId: doc.chatId,

    ...(doc.username ? { username: doc.username } : {}),

    ...(doc.firstName ? { firstName: doc.firstName } : {}),

    ...(doc.lastName ? { lastName: doc.lastName } : {}),

    timezone: doc.timezone,

    channel: doc.channel as MessagingChannel,

    reminderCount: doc.reminderCount,

    messageCount: doc.messageCount,

    createdAt: doc.createdAt.toISOString(),

    updatedAt: doc.updatedAt.toISOString(),

    lastSeenAt: doc.lastSeenAt.toISOString(),

  };

}



export class MongoCustomerRepository implements CustomerRepository {

  async upsertFromMessage(input: UpsertCustomerInput): Promise<Customer> {

    const now = new Date();

    const doc = await CustomerModel.findOneAndUpdate(

      { telegramUserId: input.telegramUserId },

      {

        $set: {

          chatId: input.chatId,

          timezone: input.timezone ?? config.DEFAULT_TIMEZONE,

          channel: input.channel ?? 'telegram',

          lastSeenAt: now,

          ...(input.username !== undefined ? { username: input.username } : {}),

          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),

          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),

        },

        $inc: { messageCount: 1 },

        $setOnInsert: {

          reminderCount: 0,

        },

      },

      { upsert: true, new: true, setDefaultsOnInsert: true }

    ).exec();



    if (!doc) {

      throw new Error('Failed to upsert customer');

    }



    return toCustomer(doc);

  }



  async findById(id: string): Promise<Customer | null> {

    const doc = await CustomerModel.findById(id).exec();

    return doc ? toCustomer(doc) : null;

  }



  async findByTelegramUserId(telegramUserId: string): Promise<Customer | null> {

    const doc = await CustomerModel.findOne({ telegramUserId }).exec();

    return doc ? toCustomer(doc) : null;

  }



  async findAll(): Promise<Customer[]> {

    const docs = await CustomerModel.find().sort({ lastSeenAt: -1 }).exec();

    return docs.map(toCustomer);

  }



  async incrementReminderCount(id: string): Promise<Customer | null> {

    const doc = await CustomerModel.findByIdAndUpdate(

      id,

      { $inc: { reminderCount: 1 } },

      { new: true }

    ).exec();

    return doc ? toCustomer(doc) : null;

  }



  async count(): Promise<number> {

    return CustomerModel.countDocuments();

  }



  async getStats(scheduledCustomerIds: string[] = []): Promise<CustomerStats> {

    const start = new Date();

    start.setHours(0, 0, 0, 0);



    const [total, activeToday] = await Promise.all([

      this.count(),

      CustomerModel.countDocuments({ lastSeenAt: { $gte: start } }),

    ]);



    return {

      total,

      activeToday,

      withScheduledReminders: new Set(scheduledCustomerIds.filter(Boolean)).size,

    };

  }

}


