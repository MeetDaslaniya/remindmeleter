"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = exports.Container = void 0;
const in_memory_reminder_repository_1 = require("../repositories/in-memory-reminder.repository");
const telegram_provider_1 = require("../providers/telegram/telegram.provider");
const ai_service_1 = require("../services/ai.service");
const reminder_service_1 = require("../services/reminder.service");
const telegram_webhook_service_1 = require("../services/telegram-webhook.service");
const scheduler_service_1 = require("../scheduler/scheduler.service");
const health_service_1 = require("../services/health.service");
const system_service_1 = require("../services/system.service");
/**
 * Simple composition root for dependency injection.
 * Swap ReminderRepository implementation here when adding MongoDB.
 */
class Container {
    reminderRepository;
    messagingProvider;
    telegramProvider;
    aiService;
    schedulerService;
    reminderService;
    telegramWebhookService;
    healthService;
    systemService;
    constructor() {
        this.reminderRepository = new in_memory_reminder_repository_1.InMemoryReminderRepository();
        this.telegramProvider = new telegram_provider_1.TelegramProvider();
        this.messagingProvider = this.telegramProvider;
        this.aiService = new ai_service_1.AiService();
        this.schedulerService = new scheduler_service_1.SchedulerService(this.reminderRepository, this.messagingProvider);
        this.reminderService = new reminder_service_1.ReminderService(this.reminderRepository, this.schedulerService);
        this.telegramWebhookService = new telegram_webhook_service_1.TelegramWebhookService(this.messagingProvider, this.aiService, this.reminderService);
        this.healthService = new health_service_1.HealthService(this.schedulerService, this.aiService, this.reminderService);
        this.systemService = new system_service_1.SystemService(this.healthService, this.telegramProvider);
    }
}
exports.Container = Container;
exports.container = new Container();
//# sourceMappingURL=container.js.map