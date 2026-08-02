import { ReminderRepository } from '../repositories/reminder.repository';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { MessagingProvider } from '../providers/messaging.provider';
import { AiService } from '../services/ai.service';
import { ReminderService } from '../services/reminder.service';
import { TelegramWebhookService } from '../services/telegram-webhook.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { HealthService } from '../services/health.service';
import { SystemService } from '../services/system.service';
/**
 * Simple composition root for dependency injection.
 * Swap ReminderRepository implementation here when adding MongoDB.
 */
export declare class Container {
    readonly reminderRepository: ReminderRepository;
    readonly messagingProvider: MessagingProvider;
    readonly telegramProvider: TelegramProvider;
    readonly aiService: AiService;
    readonly schedulerService: SchedulerService;
    readonly reminderService: ReminderService;
    readonly telegramWebhookService: TelegramWebhookService;
    readonly healthService: HealthService;
    readonly systemService: SystemService;
    constructor();
}
export declare const container: Container;
//# sourceMappingURL=container.d.ts.map