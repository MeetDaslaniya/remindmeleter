import { Reminder } from '../types';
import { formatInTimeZone } from './datetime';

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

export function formatReminderCompletedHtml(reminder: Reminder): string {
  const lines = ['<b>✅ Completed</b>', '', reminder.reason];
  if (reminder.recurrence) {
    lines.push('', '<i>Repeating reminder stopped.</i>');
  }
  return lines.join('\n');
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
