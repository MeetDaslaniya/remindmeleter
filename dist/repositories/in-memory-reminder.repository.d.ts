import { CreateReminderInput, Reminder, ReminderAnalytics, ReminderStats, ReminderStatus } from '../types';
import { ReminderRepository, ReminderSnoozePatch } from './reminder.repository';
export declare class InMemoryReminderRepository implements ReminderRepository {
    private readonly reminders;
    create(input: CreateReminderInput): Promise<Reminder>;
    findById(id: string): Promise<Reminder | null>;
    findOwnedById(id: string, telegramUserId: string): Promise<Reminder | null>;
    findAll(): Promise<Reminder[]>;
    findByStatus(status: ReminderStatus): Promise<Reminder[]>;
    findByStatuses(statuses: ReminderStatus[]): Promise<Reminder[]>;
    findByTelegramUserId(telegramUserId: string): Promise<Reminder[]>;
    updateStatus(id: string, status: ReminderStatus, extra?: Partial<Pick<Reminder, 'completedAt'>>): Promise<Reminder | null>;
    claimForExecution(id: string): Promise<Reminder | null>;
    completeOwned(id: string, telegramUserId: string, completedAt: string): Promise<Reminder | null>;
    snoozeOwned(id: string, telegramUserId: string, patch: ReminderSnoozePatch): Promise<Reminder | null>;
    update(id: string, patch: Partial<Reminder>): Promise<Reminder | null>;
    delete(id: string): Promise<boolean>;
    getStats(): Promise<Omit<ReminderStats, 'customers'>>;
    countCreatedSince(since: Date): Promise<number>;
    getAnalytics(): Promise<ReminderAnalytics>;
}
//# sourceMappingURL=in-memory-reminder.repository.d.ts.map