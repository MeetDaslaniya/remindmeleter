import { CreateReminderInput, Reminder, ReminderAnalytics, ReminderStats } from '../types';
import { ReminderRepository } from '../repositories/reminder.repository';
import { SchedulerService } from '../scheduler/scheduler.service';
import { CustomerService } from './customer.service';
export declare class ReminderService {
    private readonly reminderRepository;
    private readonly schedulerService;
    private readonly customerService?;
    constructor(reminderRepository: ReminderRepository, schedulerService: SchedulerService, customerService?: CustomerService | undefined);
    createReminder(input: CreateReminderInput): Promise<Reminder>;
    getAll(): Promise<Reminder[]>;
    getById(id: string): Promise<Reminder>;
    getScheduledForUser(telegramUserId: string): Promise<Reminder[]>;
    cancelForUser(id: string, telegramUserId: string): Promise<Reminder>;
    cancelAllForUser(telegramUserId: string): Promise<number>;
    delete(id: string): Promise<void>;
    cancel(id: string): Promise<Reminder>;
    getStats(): Promise<ReminderStats>;
    getAnalytics(): Promise<ReminderAnalytics>;
    createTestReminder(overrides?: Partial<CreateReminderInput>): Promise<Reminder>;
}
//# sourceMappingURL=reminder.service.d.ts.map