import { ReminderRepository } from '../repositories/reminder.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { MessagingProvider } from '../providers/messaging.provider';
import { AiService } from '../services/ai.service';
import { ReminderService } from '../services/reminder.service';
import { CustomerService } from '../services/customer.service';
import { TelegramWebhookService } from '../services/telegram-webhook.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { HealthService } from '../services/health.service';
import { SystemService } from '../services/system.service';
import { AdminReportService } from '../services/admin-report.service';
import { ReminderActionService } from '../services/reminder-action.service';
/**
 * Composition root — MongoDB is the persistent store for customers + reminders.
 */
export declare class Container {
    readonly reminderRepository: ReminderRepository;
    readonly customerRepository: CustomerRepository;
    readonly messagingProvider: MessagingProvider;
    readonly telegramProvider: TelegramProvider;
    readonly aiService: AiService;
    readonly schedulerService: SchedulerService;
    readonly reminderService: ReminderService;
    readonly customerService: CustomerService;
    readonly telegramWebhookService: TelegramWebhookService;
    readonly reminderActionService: ReminderActionService;
    readonly healthService: HealthService;
    readonly systemService: SystemService;
    readonly adminReportService: AdminReportService;
    constructor();
}
export declare const container: Container;
//# sourceMappingURL=container.d.ts.map