import { Reminder } from '../types';
import { ReminderRepository } from '../repositories/reminder.repository';
import { MessagingProvider } from '../providers/messaging.provider';
/**

 * Dynamic scheduling via node-schedule.

 * One-shot jobs complete after firing; recurring jobs advance to the next occurrence.

 */
export declare class SchedulerService {
    private readonly reminderRepository;
    private readonly messagingProvider;
    private readonly jobs;
    constructor(reminderRepository: ReminderRepository, messagingProvider: MessagingProvider);
    scheduleReminder(reminder: Reminder): void;
    cancelReminder(id: string): boolean;
    executeReminder(id: string): Promise<void>;
    private rescheduleIfRecurring;
    restoreScheduledJobs(): Promise<number>;
    getActiveJobCount(): number;
    cancelAndMarkCancelled(id: string): Promise<Reminder>;
}
//# sourceMappingURL=scheduler.service.d.ts.map