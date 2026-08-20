import { MessagingProvider } from '../providers/messaging.provider';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { AiService } from './ai.service';
import { ReminderService } from './reminder.service';
import { CustomerService } from './customer.service';
import { ReminderActionService } from './reminder-action.service';
export declare class TelegramWebhookService {
    private readonly messagingProvider;
    private readonly aiService;
    private readonly reminderService;
    private readonly customerService;
    private readonly telegramProvider;
    private readonly reminderActionService;
    constructor(messagingProvider: MessagingProvider, aiService: AiService, reminderService: ReminderService, customerService: CustomerService, telegramProvider: TelegramProvider, reminderActionService: ReminderActionService);
    handleUpdate(payload: unknown): Promise<void>;
    private isCommand;
    private isManagePhrase;
    private parseCommand;
    private handleCommand;
    private handleListCommand;
    private handleCancelCommand;
    private formatReminderLine;
    private handleReminderRequest;
}
//# sourceMappingURL=telegram-webhook.service.d.ts.map