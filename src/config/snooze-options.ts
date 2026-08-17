/**
 * Configurable snooze durations for Telegram inline buttons.
 * Change labels / minutes here — callback handlers look up by `id`.
 */
export interface SnoozeOption {
  id: number;
  label: string;
  /** Offset in minutes from the current scheduled time. Omit when kind is `tomorrow`. */
  minutes?: number;
  kind?: 'offset' | 'tomorrow';
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { id: 1, label: '10 min', minutes: 10, kind: 'offset' },
  { id: 2, label: '1 hour', minutes: 60, kind: 'offset' },
  { id: 3, label: '2 hours', minutes: 120, kind: 'offset' },
  { id: 4, label: '4 hours', minutes: 240, kind: 'offset' },
  { id: 5, label: 'Tomorrow', kind: 'tomorrow' },
];

export const CALLBACK_PREFIX = {
  complete: 'reminder_complete',
  snooze: 'reminder_snooze',
  snoozeOpt: 'reminder_snooze_opt',
  actions: 'reminder_actions',
} as const;

export type ReminderCallbackAction =
  | { type: 'complete'; reminderId: string }
  | { type: 'snooze'; reminderId: string }
  | { type: 'snooze_opt'; reminderId: string; optionId: number }
  | { type: 'actions'; reminderId: string };

export function findSnoozeOption(optionId: number): SnoozeOption | undefined {
  return SNOOZE_OPTIONS.find((option) => option.id === optionId);
}

export function completeCallbackData(reminderId: string): string {
  return `${CALLBACK_PREFIX.complete}:${reminderId}`;
}

export function snoozeCallbackData(reminderId: string): string {
  return `${CALLBACK_PREFIX.snooze}:${reminderId}`;
}

export function snoozeOptionCallbackData(reminderId: string, optionId: number): string {
  return `${CALLBACK_PREFIX.snoozeOpt}:${reminderId}:${optionId}`;
}

export function actionsCallbackData(reminderId: string): string {
  return `${CALLBACK_PREFIX.actions}:${reminderId}`;
}

export function parseReminderCallbackData(data: string): ReminderCallbackAction | null {
  const trimmed = data.trim();

  if (trimmed.startsWith(`${CALLBACK_PREFIX.complete}:`)) {
    const reminderId = trimmed.slice(CALLBACK_PREFIX.complete.length + 1);
    return reminderId ? { type: 'complete', reminderId } : null;
  }

  if (trimmed.startsWith(`${CALLBACK_PREFIX.snoozeOpt}:`)) {
    const payload = trimmed.slice(CALLBACK_PREFIX.snoozeOpt.length + 1);
    const sep = payload.lastIndexOf(':');
    if (sep <= 0) {
      return null;
    }
    const reminderId = payload.slice(0, sep);
    const optionId = Number(payload.slice(sep + 1));
    if (!reminderId || !Number.isInteger(optionId)) {
      return null;
    }
    return { type: 'snooze_opt', reminderId, optionId };
  }

  if (trimmed.startsWith(`${CALLBACK_PREFIX.snooze}:`)) {
    const reminderId = trimmed.slice(CALLBACK_PREFIX.snooze.length + 1);
    return reminderId ? { type: 'snooze', reminderId } : null;
  }

  if (trimmed.startsWith(`${CALLBACK_PREFIX.actions}:`)) {
    const reminderId = trimmed.slice(CALLBACK_PREFIX.actions.length + 1);
    return reminderId ? { type: 'actions', reminderId } : null;
  }

  return null;
}

export function reminderActionKeyboard(reminderId: string): InlineKeyboard {
  return [
    [
      { text: '✅ Completed', callbackData: completeCallbackData(reminderId) },
      { text: '😴 Snooze', callbackData: snoozeCallbackData(reminderId) },
    ],
  ];
}

export function snoozeOptionsKeyboard(reminderId: string): InlineKeyboard {
  const buttons = SNOOZE_OPTIONS.map((option) => ({
    text: option.label,
    callbackData: snoozeOptionCallbackData(reminderId, option.id),
  }));

  const rows: InlineKeyboard = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  rows.push([{ text: '← Back', callbackData: actionsCallbackData(reminderId) }]);
  return rows;
}

export type InlineKeyboardButton = { text: string; callbackData: string };
export type InlineKeyboard = InlineKeyboardButton[][];
