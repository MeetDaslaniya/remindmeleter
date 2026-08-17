export enum ReminderStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  SNOOZED = 'snoozed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/** Upcoming or waiting-for-user reminders (shown in /list, restored by the scheduler). */
export const ACTIVE_REMINDER_STATUSES: ReminderStatus[] = [
  ReminderStatus.SCHEDULED,
  ReminderStatus.SENT,
  ReminderStatus.SNOOZED,
];

/** How a reminder repeats after the first fire. */
export type RecurrenceKind = 'interval' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReminderRecurrence {
  kind: RecurrenceKind;
  /** Interval between firings (interval kind). */
  intervalMs?: number;
  /** Local weekdays 0=Sun … 6=Sat (weekly kind). */
  weekdays?: number[];
  /** Month 1–12 (yearly kind). */
  month?: number;
  /** Day of month 1–31 (monthly / yearly). */
  dayOfMonth?: number;
  /** Local hour 0–23 (daily / weekly / monthly / yearly). */
  hour?: number;
  /** Local minute 0–59 (daily / weekly / monthly / yearly). */
  minute?: number;
  /** Stop scheduling after this UTC instant. */
  endsAt?: string;
  /** Occurrences left including the currently scheduled one. */
  remainingCount?: number;
  /** Original total occurrences when a fixed count/window was set (for 3/8 progress). */
  totalCount?: number;
  /** Short human summary for UI / Telegram confirm. */
  summary: string;
}

export interface Reminder {
  id: string;
  customerId?: string;
  telegramUserId: string;
  chatId: string;
  originalMessage: string;
  reason: string;
  datetime: string;
  timezone: string;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  sentAt?: string;
  snoozedAt?: string;
  snoozeCount?: number;
  lastSnoozeDuration?: number;
  telegramMessageId?: number;
  channel: MessagingChannel;
  recurrence?: ReminderRecurrence;
}

export type MessagingChannel = 'telegram' | 'whatsapp' | 'messenger' | 'slack' | 'discord';

export interface Customer {
  id: string;
  telegramUserId: string;
  chatId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  timezone: string;
  channel: MessagingChannel;
  reminderCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface ParsedReminder {
  reason: string;
  datetime: string;
  timezone: string;
  recurrence?: ReminderRecurrence;
}

export interface CreateReminderInput {
  telegramUserId: string;
  chatId: string;
  originalMessage: string;
  reason: string;
  datetime: string;
  timezone: string;
  channel?: MessagingChannel;
  recurrence?: ReminderRecurrence;
  customerId?: string;
}

export interface UpsertCustomerInput {
  telegramUserId: string;
  chatId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  channel?: MessagingChannel;
}

export interface ReminderStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  failed: number;
  today: number;
  customers: number;
}

export interface CustomerStats {
  total: number;
  activeToday: number;
  withScheduledReminders: number;
}

export interface ReminderAnalytics {
  statusBreakdown: {
    completed: number;
    scheduled: number;
    cancelled: number;
    failed: number;
  };
  remindersPerDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  services: {
    scheduler: boolean;
    messaging: boolean;
    ai: boolean;
    mongodb: boolean;
  };
  reminders: {
    scheduled: number;
    activeJobs: number;
  };
}

export interface WebhookStatus {
  configured: boolean;
  url: string;
  expectedUrl: string;
  matchesExpected: boolean;
  pendingUpdateCount: number;
  lastErrorMessage?: string;
  lastErrorDate?: string;
  ipAddress?: string;
}

export interface SystemStatus {
  baseUrl: string;
  localApi: HealthStatus;
  webhook: WebhookStatus;
  checkedAt: string;
}

export interface WebhookSyncResult {
  webhookUrl: string;
}
