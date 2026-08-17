import {
  addDaysToDatePart,
  formatLocalIsoInTimeZone,
  resolveToUtcDate,
  zonedLocalDateTimeToUtc,
} from '../utils/datetime';
import {
  findSnoozeOption,
  parseReminderCallbackData,
  reminderActionKeyboard,
  snoozeOptionsKeyboard,
  SnoozeOption,
} from '../config/snooze-options';
import { Reminder, ReminderStatus } from '../types';
import { ReminderRepository } from '../repositories/reminder.repository';
import { SchedulerService } from '../scheduler/scheduler.service';
import {
  TelegramCallbackQuery,
  TelegramProvider,
} from '../providers/telegram/telegram.provider';
import { logger } from '../utils/logger';
import {
  formatReminderCompletedHtml,
  formatReminderFireHtml,
  formatReminderSnoozedHtml,
  formatSnoozePromptHtml,
} from '../utils/reminder-message';

const DUPLICATE_CALLBACK_TTL_MS = 10 * 60 * 1000;

export class ReminderActionService {
  private readonly processedCallbacks = new Map<string, number>();

  constructor(
    private readonly reminderRepository: ReminderRepository,
    private readonly schedulerService: SchedulerService,
    private readonly telegramProvider: TelegramProvider
  ) {}

  async handleReminderCallback(callback: TelegramCallbackQuery): Promise<void> {
    const toast = await this.dispatchCallback(callback);
    await this.telegramProvider.answerCallbackQuery(callback.callbackId, toast);
  }

  private async dispatchCallback(callback: TelegramCallbackQuery): Promise<string | undefined> {
    if (this.isDuplicateCallback(callback.callbackId)) {
      return undefined;
    }

    const parsed = parseReminderCallbackData(callback.data);
    if (!parsed) {
      return 'Unknown action';
    }

    try {
      if (parsed.type === 'complete') {
        return await this.completeReminder(parsed.reminderId, callback);
      }
      if (parsed.type === 'snooze') {
        return await this.showSnoozeOptions(parsed.reminderId, callback);
      }
      if (parsed.type === 'snooze_opt') {
        return await this.snoozeReminder(parsed.reminderId, parsed.optionId, callback);
      }
      return await this.restoreActionButtons(parsed.reminderId, callback);
    } catch (error) {
      logger.error('Reminder callback failed', {
        reminderId: parsed.reminderId,
        userId: callback.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 'Something went wrong. Please try again.';
    }
  }

  async completeReminder(
    reminderId: string,
    callback: TelegramCallbackQuery
  ): Promise<string> {
    const completedAt = new Date().toISOString();
    const updated = await this.reminderRepository.completeOwned(
      reminderId,
      callback.userId,
      completedAt
    );

    if (updated) {
      this.schedulerService.cancelReminder(updated.id);
      await this.editReminderMessage(
        updated,
        callback,
        formatReminderCompletedHtml(updated),
        null
      );
      logger.info('Reminder completed by user', {
        id: updated.id,
        telegramUserId: callback.userId,
      });
      return 'Completed';
    }

    const existing = await this.reminderRepository.findOwnedById(reminderId, callback.userId);
    if (!existing) {
      return 'Reminder not found';
    }
    if (existing.status === ReminderStatus.COMPLETED) {
      await this.editReminderMessage(
        existing,
        callback,
        formatReminderCompletedHtml(existing),
        null
      );
      return 'Already completed';
    }
    if (existing.status === ReminderStatus.CANCELLED) {
      return 'This reminder was cancelled';
    }
    return 'This reminder cannot be completed';
  }

  async showSnoozeOptions(
    reminderId: string,
    callback: TelegramCallbackQuery
  ): Promise<string> {
    const reminder = await this.reminderRepository.findOwnedById(reminderId, callback.userId);
    if (!reminder) {
      return 'Reminder not found';
    }
    if (reminder.status === ReminderStatus.COMPLETED) {
      await this.editReminderMessage(
        reminder,
        callback,
        formatReminderCompletedHtml(reminder),
        null
      );
      return 'Already completed';
    }
    if (reminder.status === ReminderStatus.CANCELLED) {
      return 'This reminder was cancelled';
    }
    if (
      reminder.status !== ReminderStatus.SENT &&
      reminder.status !== ReminderStatus.SCHEDULED &&
      reminder.status !== ReminderStatus.SNOOZED
    ) {
      return 'This reminder cannot be snoozed';
    }

    await this.editReminderMessage(
      reminder,
      callback,
      formatSnoozePromptHtml(reminder),
      snoozeOptionsKeyboard(reminder.id)
    );
    return 'Choose a snooze time';
  }

  async snoozeReminder(
    reminderId: string,
    optionId: number,
    callback: TelegramCallbackQuery
  ): Promise<string> {
    const option = findSnoozeOption(optionId);
    if (!option) {
      return 'Invalid snooze option';
    }

    const existing = await this.reminderRepository.findOwnedById(reminderId, callback.userId);
    if (!existing) {
      return 'Reminder not found';
    }
    if (existing.status === ReminderStatus.COMPLETED) {
      await this.editReminderMessage(
        existing,
        callback,
        formatReminderCompletedHtml(existing),
        null
      );
      return 'Already completed';
    }
    if (existing.status === ReminderStatus.CANCELLED) {
      return 'This reminder was cancelled';
    }

    const now = new Date();
    const nextAt = computeSnoozeUntil(option, existing, now);
    const durationMinutes = Math.max(
      1,
      Math.round((nextAt.getTime() - resolveSnoozeBase(existing).getTime()) / 60_000)
    );

    const updated = await this.reminderRepository.snoozeOwned(reminderId, callback.userId, {
      status: ReminderStatus.SNOOZED,
      datetime: nextAt.toISOString(),
      snoozedAt: now.toISOString(),
      lastSnoozeDuration: option.minutes ?? durationMinutes,
    });

    if (!updated) {
      return 'This reminder was already snoozed';
    }

    this.schedulerService.cancelReminder(updated.id);
    this.schedulerService.scheduleReminder(updated);

    await this.editReminderMessage(
      updated,
      callback,
      formatReminderSnoozedHtml(updated, nextAt),
      null
    );

    logger.info('Reminder snoozed', {
      id: updated.id,
      telegramUserId: callback.userId,
      optionId: option.id,
      nextAt: nextAt.toISOString(),
      snoozeCount: updated.snoozeCount,
    });
    return `Snoozed ${option.label}`;
  }

  private async restoreActionButtons(
    reminderId: string,
    callback: TelegramCallbackQuery
  ): Promise<string | undefined> {
    const reminder = await this.reminderRepository.findOwnedById(reminderId, callback.userId);
    if (!reminder) {
      return 'Reminder not found';
    }
    if (reminder.status === ReminderStatus.COMPLETED) {
      await this.editReminderMessage(
        reminder,
        callback,
        formatReminderCompletedHtml(reminder),
        null
      );
      return 'Already completed';
    }

    await this.editReminderMessage(
      reminder,
      callback,
      formatReminderFireHtml(reminder),
      reminderActionKeyboard(reminder.id)
    );
    return undefined;
  }

  private async editReminderMessage(
    reminder: Reminder,
    callback: TelegramCallbackQuery,
    text: string,
    inlineKeyboard: ReturnType<typeof reminderActionKeyboard> | null
  ): Promise<void> {
    const chatId = reminder.chatId || callback.chatId;
    const messageId = reminder.telegramMessageId ?? callback.messageId;
    if (!chatId || messageId === undefined) {
      return;
    }

    try {
      await this.telegramProvider.editMessage({
        chatId,
        messageId,
        text,
        parseMode: 'HTML',
        inlineKeyboard,
      });
    } catch {
      try {
        const sent = await this.telegramProvider.sendMessage({
          chatId,
          text,
          parseMode: 'HTML',
          ...(inlineKeyboard ? { inlineKeyboard } : {}),
        });
        if (sent.messageId) {
          await this.reminderRepository.update(reminder.id, {
            telegramMessageId: Number(sent.messageId),
          });
        }
      } catch (error) {
        logger.warn('Could not update reminder Telegram message', {
          id: reminder.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private isDuplicateCallback(callbackId: string): boolean {
    this.pruneProcessedCallbacks();
    if (this.processedCallbacks.has(callbackId)) {
      return true;
    }
    this.processedCallbacks.set(callbackId, Date.now());
    return false;
  }

  private pruneProcessedCallbacks(): void {
    const cutoff = Date.now() - DUPLICATE_CALLBACK_TTL_MS;
    for (const [id, seenAt] of this.processedCallbacks) {
      if (seenAt < cutoff) {
        this.processedCallbacks.delete(id);
      }
    }
  }
}

function resolveSnoozeBase(reminder: Reminder): Date {
  if (reminder.sentAt) {
    try {
      return resolveToUtcDate(reminder.sentAt, reminder.timezone);
    } catch {
      const parsed = new Date(reminder.sentAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return resolveToUtcDate(reminder.datetime, reminder.timezone);
}

function computeSnoozeUntil(option: SnoozeOption, reminder: Reminder, now: Date): Date {
  if (option.kind === 'tomorrow') {
    const base = resolveSnoozeBase(reminder);
    const local = formatLocalIsoInTimeZone(base, reminder.timezone);
    const datePart = local.slice(0, 10);
    const timePart = local.slice(11);
    let days = 1;
    let next = zonedLocalDateTimeToUtc(
      `${addDaysToDatePart(datePart, days)}T${timePart}`,
      reminder.timezone
    );
    while (next.getTime() <= now.getTime() && days < 14) {
      days += 1;
      next = zonedLocalDateTimeToUtc(
        `${addDaysToDatePart(datePart, days)}T${timePart}`,
        reminder.timezone
      );
    }
    return next;
  }

  const minutes = option.minutes ?? 0;
  const base = resolveSnoozeBase(reminder);
  let next = new Date(base.getTime() + minutes * 60_000);
  if (next.getTime() <= now.getTime()) {
    next = new Date(now.getTime() + minutes * 60_000);
  }
  return next;
}
