import { CreateReminderInput, Reminder, ReminderAnalytics, ReminderStats, ReminderStatus } from '../types';
/**

 * Repository interface — swap InMemoryReminderRepository for MongoDB

 * (or any other store) without changing controllers or services.

 */
export interface ReminderRepository {
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
//# sourceMappingURL=reminder.repository.d.ts.map