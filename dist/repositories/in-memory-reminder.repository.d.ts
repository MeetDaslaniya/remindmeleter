import { CreateReminderInput, Reminder, ReminderAnalytics, ReminderStats, ReminderStatus } from '../types';
import { ReminderRepository } from './reminder.repository';
export declare class InMemoryReminderRepository implements ReminderRepository {
    private readonly reminders;
    create(input: CreateReminderInput): Promise<Reminder>;
    findById(id: string): Promise<Reminder | null>;
    findAll(): Promise<Reminder[]>;
    findByStatus(status: ReminderStatus): Promise<Reminder[]>;
    updateStatus(id: string, status: ReminderStatus, extra?: Partial<Pick<Reminder, 'completedAt'>>): Promise<Reminder | null>;
    update(id: string, patch: Partial<Reminder>): Promise<Reminder | null>;
    delete(id: string): Promise<boolean>;
    getStats(): Promise<ReminderStats>;
    getAnalytics(): Promise<ReminderAnalytics>;
}
//# sourceMappingURL=in-memory-reminder.repository.d.ts.map