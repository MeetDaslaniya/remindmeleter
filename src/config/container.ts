import { MongoReminderRepository } from '../repositories/mongo-reminder.repository';
import { MongoCustomerRepository } from '../repositories/mongo-customer.repository';
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
export class Container {
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

  constructor() {
    this.reminderRepository = new MongoReminderRepository();
    this.customerRepository = new MongoCustomerRepository();
    this.telegramProvider = new TelegramProvider();
    this.messagingProvider = this.telegramProvider;
    this.aiService = new AiService();

    this.schedulerService = new SchedulerService(
      this.reminderRepository,
      this.messagingProvider
    );

    this.customerService = new CustomerService(
      this.customerRepository,
      this.reminderRepository
    );

    this.reminderService = new ReminderService(
      this.reminderRepository,
      this.schedulerService,
      this.customerService
    );

    this.reminderActionService = new ReminderActionService(
      this.reminderRepository,
      this.schedulerService,
      this.telegramProvider
    );

    this.telegramWebhookService = new TelegramWebhookService(
      this.messagingProvider,
      this.aiService,
      this.reminderService,
      this.customerService,
      this.telegramProvider,
      this.reminderActionService
    );

    this.healthService = new HealthService(
      this.schedulerService,
      this.aiService,
      this.reminderService
    );

    this.systemService = new SystemService(this.healthService, this.telegramProvider);

    this.adminReportService = new AdminReportService(
      this.messagingProvider,
      this.healthService,
      this.customerRepository,
      this.reminderRepository
    );
  }
}

export const container = new Container();
