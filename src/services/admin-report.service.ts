import schedule, { Job } from 'node-schedule';
import { config } from '../config';
import { MessagingProvider } from '../providers/messaging.provider';
import { CustomerRepository } from '../repositories/customer.repository';
import { ReminderRepository } from '../repositories/reminder.repository';
import { HealthService } from './health.service';
import { startOfZonedDay, zonedDateKey } from '../utils/datetime';
import { logger } from '../utils/logger';

const MORNING_JOB = 'admin-morning-health';
const EOD_JOB = 'admin-eod-report';

/**
 * Daily admin Telegram pings:
 * - 08:00 DEFAULT_TIMEZONE — health / cron heartbeat
 * - 19:00 DEFAULT_TIMEZONE — EOD customer + reminder stats
 */
export class AdminReportService {
  private readonly jobs = new Map<string, Job>();

  constructor(
    private readonly messagingProvider: MessagingProvider,
    private readonly healthService: HealthService,
    private readonly customerRepository: CustomerRepository,
    private readonly reminderRepository: ReminderRepository
  ) {}

  start(): void {
    const chatId = config.ADMIN_TELEGRAM_CHAT_ID?.trim();
    if (!chatId) {
      logger.warn('ADMIN_TELEGRAM_CHAT_ID not set — daily admin reports disabled');
      return;
    }

    const tz = config.DEFAULT_TIMEZONE;

    this.cancelJob(MORNING_JOB);
    this.cancelJob(EOD_JOB);

    const morning = schedule.scheduleJob(
      MORNING_JOB,
      { rule: '0 8 * * *', tz },
      () => {
        void this.sendMorningHealth(chatId);
      }
    );

    const eod = schedule.scheduleJob(
      EOD_JOB,
      { rule: '0 19 * * *', tz },
      () => {
        void this.sendEodReport(chatId);
      }
    );

    if (morning) {
      this.jobs.set(MORNING_JOB, morning);
    }
    if (eod) {
      this.jobs.set(EOD_JOB, eod);
    }

    logger.info('Admin report jobs scheduled', {
      timezone: tz,
      chatId,
      morning: '08:00',
      eod: '19:00',
    });
  }

  stop(): void {
    for (const name of [...this.jobs.keys()]) {
      this.cancelJob(name);
    }
  }

  async sendMorningHealth(chatId = config.ADMIN_TELEGRAM_CHAT_ID?.trim()): Promise<void> {
    if (!chatId) {
      return;
    }

    try {
      const health = await this.healthService.getStatus();
      const dateKey = zonedDateKey(config.DEFAULT_TIMEZONE);
      const uptimeHours = (health.uptime / 3600).toFixed(1);

      const text = [
        `☀️ <b>Good morning, Boss</b>`,
        `Hello Boss, I am ok ✅`,
        '',
        `<b>PingLater</b> day-start health · ${dateKey}`,
        `Status: <b>${health.status}</b>`,
        `Uptime: ${uptimeHours}h`,
        `Memory: ${health.memory.used}/${health.memory.total} MB`,
        `Scheduler jobs: ${health.reminders.activeJobs}`,
        `Active reminders: ${health.reminders.scheduled}`,
        `MongoDB: ${health.services.mongodb ? 'ok' : 'down'}`,
        `AI: ${health.services.ai ? 'ok' : 'down'}`,
        '',
        `Cron is running · ${config.DEFAULT_TIMEZONE}`,
      ].join('\n');

      await this.messagingProvider.sendMessage({
        chatId,
        text,
        parseMode: 'HTML',
      });

      logger.info('Admin morning health sent', { chatId });
    } catch (error: unknown) {
      logger.error('Failed to send morning health', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendEodReport(chatId = config.ADMIN_TELEGRAM_CHAT_ID?.trim()): Promise<void> {
    if (!chatId) {
      return;
    }

    try {
      const dayStart = startOfZonedDay(config.DEFAULT_TIMEZONE);
      const dateKey = zonedDateKey(config.DEFAULT_TIMEZONE);

      const [newCustomers, remindersSetToday, totalCustomers, reminderStats] = await Promise.all([
        this.customerRepository.countCreatedSince(dayStart),
        this.reminderRepository.countCreatedSince(dayStart),
        this.customerRepository.count(),
        this.reminderRepository.getStats(),
      ]);

      const text = [
        `📊 <b>PingLater — Daily EOD Update</b>`,
        `Date: ${dateKey} (${config.DEFAULT_TIMEZONE})`,
        '',
        `Today new customers: <b>${newCustomers}</b>`,
        `Total reminders set today: <b>${remindersSetToday}</b>`,
        '',
        `Total customers: <b>${totalCustomers}</b>`,
        `Total reminders (all time): <b>${reminderStats.total}</b>`,
        `Currently scheduled: <b>${reminderStats.scheduled}</b>`,
        `Completed: <b>${reminderStats.completed}</b>`,
        `Cancelled: <b>${reminderStats.cancelled}</b>`,
        '',
        `Have a good evening, Boss 👋`,
      ].join('\n');

      await this.messagingProvider.sendMessage({
        chatId,
        text,
        parseMode: 'HTML',
      });

      logger.info('Admin EOD report sent', { chatId, newCustomers, remindersSetToday });
    } catch (error: unknown) {
      logger.error('Failed to send EOD report', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private cancelJob(name: string): void {
    const existing = this.jobs.get(name);
    if (existing) {
      existing.cancel();
      this.jobs.delete(name);
    }
  }
}
