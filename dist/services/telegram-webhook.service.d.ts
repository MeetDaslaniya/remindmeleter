import { MessagingProvider } from '../providers/messaging.provider';
import { AiService } from './ai.service';
import { ReminderService } from './reminder.service';
export declare class TelegramWebhookService {
    private readonly messagingProvider;
    private readonly aiService;
    private readonly reminderService;
    constructor(messagingProvider: MessagingProvider, aiService: AiService, reminderService: ReminderService);
    handleUpdate(payload: unknown): Promise<void>;
    private isCommand;
    private handleCommand;
    private handleReminderRequest;
}
//# sourceMappingURL=telegram-webhook.service.d.ts.map