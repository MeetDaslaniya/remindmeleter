import {

  CreateReminderInput,

  Reminder,

  ReminderAnalytics,

  ReminderStats,

  ReminderStatus,

} from '../types';



export interface ReminderSnoozePatch {

  datetime: string;

  snoozedAt: string;

  lastSnoozeDuration: number;

  status: ReminderStatus;

}



/**

 * Repository interface — MongoReminderRepository is the production store.
 * InMemoryReminderRepository remains available for local tests without Mongo.

 */

export interface ReminderRepository {

  create(input: CreateReminderInput): Promise<Reminder>;

  findById(id: string): Promise<Reminder | null>;

  findOwnedById(id: string, telegramUserId: string): Promise<Reminder | null>;

  findAll(): Promise<Reminder[]>;

  findByStatus(status: ReminderStatus): Promise<Reminder[]>;

  findByStatuses(statuses: ReminderStatus[]): Promise<Reminder[]>;

  findByTelegramUserId(telegramUserId: string): Promise<Reminder[]>;

  updateStatus(

    id: string,

    status: ReminderStatus,

    extra?: Partial<Pick<Reminder, 'completedAt'>>

  ): Promise<Reminder | null>;

  update(id: string, patch: Partial<Reminder>): Promise<Reminder | null>;

  delete(id: string): Promise<boolean>;

  /**
   * Atomically claim a scheduled/snoozed reminder for execution.
   * Returns the reminder as it was before claim, or null if already claimed/not due.
   */
  claimForExecution(id: string): Promise<Reminder | null>;

  /**
   * Complete exactly one reminder owned by this Telegram user.
   * Returns the updated reminder, or null if the row was not actionable (already done / not owned).
   */
  completeOwned(id: string, telegramUserId: string, completedAt: string): Promise<Reminder | null>;

  /**
   * Snooze exactly one reminder owned by this Telegram user.
   * Returns the updated reminder, or null if the row was not actionable.
   */
  snoozeOwned(

    id: string,

    telegramUserId: string,

    patch: ReminderSnoozePatch

  ): Promise<Reminder | null>;

  getStats(): Promise<Omit<ReminderStats, 'customers'>>;

  getAnalytics(): Promise<ReminderAnalytics>;

  /** Reminders with createdAt >= since (UTC instant). */
  countCreatedSince(since: Date): Promise<number>;

}
