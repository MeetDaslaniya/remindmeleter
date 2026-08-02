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

  readonly healthService: HealthService;

  readonly systemService: SystemService;



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

    this.telegramWebhookService = new TelegramWebhookService(

      this.messagingProvider,

      this.aiService,

      this.reminderService,

      this.customerService

    );

    this.healthService = new HealthService(

      this.schedulerService,

      this.aiService,

      this.reminderService

    );

    this.systemService = new SystemService(this.healthService, this.telegramProvider);

  }

}



export const container = new Container();


