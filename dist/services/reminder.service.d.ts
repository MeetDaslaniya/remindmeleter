import { CreateReminderInput, Reminder, ReminderAnalytics, ReminderStats } from '../types';
import { ReminderRepository } from '../repositories/reminder.repository';
import { SchedulerService } from '../scheduler/scheduler.service';
export declare class ReminderService {
    private readonly reminderRepository;
    private readonly schedulerService;
    constructor(reminderRepository: ReminderRepository, schedulerService: SchedulerService);
    createReminder(input: CreateReminderInput): Promise<Reminder>;
    getAll(): Promise<Reminder[]>;
    getById(id: string): Promise<Reminder>;
    delete(id: string): Promise<void>;
    cancel(id: string): Promise<Reminder>;
    getStats(): Promise<ReminderStats>;
    getAnalytics(): Promise<ReminderAnalytics>;
    createTestReminder(overrides?: Partial<CreateReminderInput>): Promise<Reminder>;
}
//# sourceMappingURL=reminder.service.d.ts.map