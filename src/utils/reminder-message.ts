import { Reminder } from '../types';
import { formatInTimeZone, resolveToUtcDate } from './datetime';

export function formatReminderFireHtml(reminder: Reminder): string {
  const lines = ['<b>⏰ Reminder</b>', '', reminder.reason];

  if (!reminder.recurrence) {
    return lines.join('\n');
  }

  const summary = reminder.recurrence.summary.replace(/\s*\(\d+\s+times?\)\s*$/i, '').trim();
  lines.push('', `<i>${summary}</i>`);

  const total = reminder.recurrence.totalCount;
  const remaining = reminder.recurrence.remainingCount;
  if (
    total !== undefined &&
    remaining !== undefined &&
    Number.isFinite(total) &&
    Number.isFinite(remaining) &&
    total > 0
  ) {
    const current = Math.min(total, Math.max(1, total - remaining + 1));
    lines.push(`<b>${current}/${total} times</b>`);
  }

  return lines.join('\n');
}

export function formatReminderCompletedHtml(
  reminder: Reminder,
  isRecurringOccurrence = false
): string {
  if (isRecurringOccurrence) {
    const lines = ['<b>✅ Done</b>', '', reminder.reason];
    if (reminder.datetime) {
      try {
        const nextDate = resolveToUtcDate(reminder.datetime, reminder.timezone);
        const when = formatInTimeZone(nextDate, reminder.timezone);
        lines.push('', `🔁 <b>Next reminder:</b> ${when} (${reminder.timezone})`);
      } catch {
        // ignore format error
      }
    }
    if (reminder.recurrence?.summary) {
      lines.push(`<i>${reminder.recurrence.summary}</i>`);
    }
    return lines.join('\n');
  }

  const lines = ['<b>✅ Completed</b>', '', reminder.reason];
  if (reminder.recurrence) {
    lines.push('', '<i>Repeating reminder completed.</i>');
  }
  return lines.join('\n');
}

export function formatReminderSeriesStoppedHtml(reminder: Reminder): string {
  return [
    '<b>🛑 Repeating stopped</b>',
    '',
    reminder.reason,
    '',
    '<i>Future recurring reminders have been stopped.</i>',
  ].join('\n');
}

export function formatReminderSnoozedHtml(reminder: Reminder, nextAt: Date): string {
  const when = formatInTimeZone(nextAt, reminder.timezone);
  return [
    '<b>😴 Snoozed</b>',
    '',
    reminder.reason,
    '',
    `<b>Next reminder:</b> ${when} (${reminder.timezone})`,
  ].join('\n');
}

export function formatSnoozePromptHtml(reminder: Reminder): string {
  return ['<b>😴 Snooze reminder</b>', '', reminder.reason].join('\n');
}
