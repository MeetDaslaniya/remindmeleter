import {

  CreateReminderInput,

  Reminder,

  ReminderAnalytics,

  ReminderStats,

  ReminderStatus,

} from '../types';



/**

 * Repository interface — MongoReminderRepository is the production store.

 * InMemoryReminderRepository remains available for local tests without Mongo.

 */

export interface ReminderRepository {

  create(input: CreateReminderInput): Promise<Reminder>;

  findById(id: string): Promise<Reminder | null>;

  findAll(): Promise<Reminder[]>;

  findByStatus(status: ReminderStatus): Promise<Reminder[]>;

  findByTelegramUserId(telegramUserId: string): Promise<Reminder[]>;

  updateStatus(

    id: string,

    status: ReminderStatus,

    extra?: Partial<Pick<Reminder, 'completedAt'>>

  ): Promise<Reminder | null>;

  update(id: string, patch: Partial<Reminder>): Promise<Reminder | null>;

  delete(id: string): Promise<boolean>;

  getStats(): Promise<Omit<ReminderStats, 'customers'>>;

  getAnalytics(): Promise<ReminderAnalytics>;

  /** Reminders with createdAt >= since (UTC instant). */
  countCreatedSince(since: Date): Promise<number>;
}


