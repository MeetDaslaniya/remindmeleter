"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = exports.Container = void 0;
const mongo_reminder_repository_1 = require("../repositories/mongo-reminder.repository");
const mongo_customer_repository_1 = require("../repositories/mongo-customer.repository");
const telegram_provider_1 = require("../providers/telegram/telegram.provider");
const ai_service_1 = require("../services/ai.service");
const reminder_service_1 = require("../services/reminder.service");
const customer_service_1 = require("../services/customer.service");
const telegram_webhook_service_1 = require("../services/telegram-webhook.service");
const scheduler_service_1 = require("../scheduler/scheduler.service");
const health_service_1 = require("../services/health.service");
const system_service_1 = require("../services/system.service");
const admin_report_service_1 = require("../services/admin-report.service");
const reminder_action_service_1 = require("../services/reminder-action.service");
/**
 * Composition root — MongoDB is the persistent store for customers + reminders.
 */
class Container {
    reminderRepository;
    customerRepository;
    messagingProvider;
    telegramProvider;
    aiService;
    schedulerService;
    reminderService;
    customerService;
    telegramWebhookService;
    reminderActionService;
    healthService;
    systemService;
    adminReportService;
    constructor() {
        this.reminderRepository = new mongo_reminder_repository_1.MongoReminderRepository();
        this.customerRepository = new mongo_customer_repository_1.MongoCustomerRepository();
        this.telegramProvider = new telegram_provider_1.TelegramProvider();
        this.messagingProvider = this.telegramProvider;
        this.aiService = new ai_service_1.AiService();
        this.schedulerService = new scheduler_service_1.SchedulerService(this.reminderRepository, this.messagingProvider);
        this.customerService = new customer_service_1.CustomerService(this.customerRepository, this.reminderRepository);
        this.reminderService = new reminder_service_1.ReminderService(this.reminderRepository, this.schedulerService, this.customerService);
        this.reminderActionService = new reminder_action_service_1.ReminderActionService(this.reminderRepository, this.schedulerService, this.telegramProvider);
        this.telegramWebhookService = new telegram_webhook_service_1.TelegramWebhookService(this.messagingProvider, this.aiService, this.reminderService, this.customerService, this.telegramProvider, this.reminderActionService);
        this.healthService = new health_service_1.HealthService(this.schedulerService, this.aiService, this.reminderService);
        this.systemService = new system_service_1.SystemService(this.healthService, this.telegramProvider);
        this.adminReportService = new admin_report_service_1.AdminReportService(this.messagingProvider, this.healthService, this.customerRepository, this.reminderRepository);
    }
}
exports.Container = Container;
exports.container = new Container();
//# sourceMappingURL=container.js.map