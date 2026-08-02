import { Reminder, ReminderRecurrence } from '../types';
import {
  formatLocalIsoInTimeZone,
  zonedLocalDateTimeToUtc,
} from './datetime';

export interface RecurringParseResult {
  reason: string;
  datetimeUtc: string;
  timezone: string;
  recurrence: ReminderRecurrence;
}

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  minutes: 60_000,
  min: 60_000,
  mins: 60_000,
  hour: 3_600_000,
  hours: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  day: 86_400_000,
  days: 86_400_000,
};

/**
 * Deterministic parsers for recurring reminders, e.g.:
 * - every minute for next 5 minutes to drink water
 * - every sunday at 6AM to play cricket
 * - 15 min before … at 9:00AM (daily offset)
 */
export function tryParseRecurringReminder(
  message: string,
  timezone: string,
  now: Date = new Date()
): RecurringParseResult | null {
  return (
    tryParseIntervalWindow(message, timezone, now) ??
    tryParseWeekly(message, timezone, now) ??
    tryParseBeforeOffsetDaily(message, timezone, now) ??
    tryParseEveryDayAt(message, timezone, now)
  );
}

/** "every minute for next 5 minutes … drink water" */
function tryParseIntervalWindow(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  const match = message.match(
    /\bevery\s+(\d+)?\s*(minutes?|mins?|hours?|hrs?|days?)\b(?:\s+for\s+(?:the\s+)?next\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?))?/i
  );
  if (!match) {
    return null;
  }

  // Prefer weekly / clock patterns when "every sunday at …" — handled elsewhere.
  if (/\bevery\s+(sun|mon|tue|wed|thu|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(message)) {
    return null;
  }
  if (/\bevery\s+(day|morning|evening|night)\b/i.test(message) && /\bat\b/i.test(message)) {
    return null;
  }

  const intervalAmount = match[1] ? Number(match[1]) : 1;
  const intervalUnit = match[2].toLowerCase();
  const intervalMs = (UNIT_MS[intervalUnit] ?? 0) * intervalAmount;
  if (!intervalMs || intervalAmount <= 0) {
    return null;
  }

  let remainingCount: number | undefined;
  let endsAt: string | undefined;
  let summary: string;

  if (match[3] && match[4]) {
    const windowAmount = Number(match[3]);
    const windowUnit = match[4].toLowerCase();
    const windowMs = (UNIT_MS[windowUnit] ?? 0) * windowAmount;
    if (!windowMs || windowAmount <= 0) {
      return null;
    }
    remainingCount = Math.max(1, Math.floor(windowMs / intervalMs));
    endsAt = new Date(now.getTime() + windowMs + 5_000).toISOString();
    summary = `Every ${formatDuration(intervalAmount, intervalUnit)} for the next ${formatDuration(windowAmount, windowUnit)} (${remainingCount} times)`;
  } else {
    // Open-ended interval without a window is risky; require a window.
    return null;
  }

  const firstAt = new Date(now.getTime() + intervalMs);
  const reason = extractReason(message, [
    /\bevery\s+(\d+)?\s*(minutes?|mins?|hours?|hrs?|days?)\b/i,
    /\bfor\s+(?:the\s+)?next\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?)\b/i,
  ]);

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'interval',
      intervalMs,
      remainingCount,
      endsAt,
      summary,
    },
  };
}

/** "every sunday at 6AM …" or "every sunday to …" (defaults to 00:00) */
function tryParseWeekly(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  const match = message.match(
    /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i
  );
  if (!match) {
    return null;
  }

  const weekday = WEEKDAY_MAP[match[1].toLowerCase()];
  if (weekday === undefined) {
    return null;
  }

  // No clock given → midnight (00:00) local time.
  const clock = parseClock(match[2], match[3], match[4]) ?? { hour: 0, minute: 0 };
  const usedDefaultMidnight = match[2] === undefined;

  const firstAt = nextWeeklyOccurrence([weekday], clock.hour, clock.minute, timezone, now);
  const dayName = capitalize(match[1].toLowerCase());
  const summary = usedDefaultMidnight
    ? `Every ${dayName} at 12:00 AM (midnight)`
    : `Every ${dayName} at ${formatClockLabel(clock.hour, clock.minute)}`;
  const reason = extractReason(message, [
    /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
    /\bon\s+/i,
  ]);

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'weekly',
      weekdays: [weekday],
      hour: clock.hour,
      minute: clock.minute,
      summary,
    },
  };
}

/** "every day at 9AM …" */
function tryParseEveryDayAt(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  const match = message.match(
    /\bevery\s+day\b(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i
  );
  if (!match) {
    return null;
  }

  // No clock given → midnight (00:00) local time.
  const clock = parseClock(match[1], match[2], match[3]) ?? { hour: 0, minute: 0 };
  const usedDefaultMidnight = match[1] === undefined;

  const firstAt = nextDailyOccurrence(clock.hour, clock.minute, timezone, now);
  const summary = usedDefaultMidnight
    ? 'Every day at 12:00 AM (midnight)'
    : `Every day at ${formatClockLabel(clock.hour, clock.minute)}`;
  const reason = extractReason(message, [
    /\bevery\s+day\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
  ]);

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'daily',
      hour: clock.hour,
      minute: clock.minute,
      summary,
    },
  };
}

/**
 * "15 min before … office … at 9:00AM"
 * "before 15 min to go for office … at 9:00AM"
 * → daily reminder at 8:45 AM
 */
function tryParseBeforeOffsetDaily(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  const beforeMatch =
    message.match(/\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\s+before\b/i) ??
    message.match(/\bbefore\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!beforeMatch || !timeMatch) {
    return null;
  }

  const offsetAmount = Number(beforeMatch[1]);
  const offsetUnit = beforeMatch[2].toLowerCase();
  const offsetMs = (UNIT_MS[offsetUnit] ?? 0) * offsetAmount;
  if (!offsetMs || offsetAmount <= 0) {
    return null;
  }

  const eventClock = parseClock(timeMatch[1], timeMatch[2], timeMatch[3]);
  if (!eventClock) {
    return null;
  }

  const eventMinutes = eventClock.hour * 60 + eventClock.minute;
  const offsetMinutes = Math.round(offsetMs / 60_000);
  let remindMinutes = eventMinutes - offsetMinutes;
  // Wrap within the day (e.g. 15 min before 00:10 → 23:55 previous calendar day → still daily at that clock)
  if (remindMinutes < 0) {
    remindMinutes += 24 * 60;
  }

  const hour = Math.floor(remindMinutes / 60) % 24;
  const minute = remindMinutes % 60;
  const firstAt = nextDailyOccurrence(hour, minute, timezone, now);
  const summary = `Every day at ${formatClockLabel(hour, minute)} (${formatDuration(offsetAmount, offsetUnit)} before ${formatClockLabel(eventClock.hour, eventClock.minute)})`;

  let reason = extractReason(message, [
    /\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\s+before\b/i,
    /\bbefore\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
    /\bi\s+go\s+to\s+office\b/i,
    /\bto\s+go\s+(?:for\s+)?office\b/i,
    /\bgo\s+(?:for\s+)?office\b/i,
  ]);

  // Soften awkward leftovers like "take all necessary thing"
  reason = reason.replace(/\bto\s+go\b/i, '').replace(/\s+/g, ' ').trim() || reason;

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'daily',
      hour,
      minute,
      summary,
    },
  };
}

export function computeNextOccurrence(reminder: Reminder, after: Date): Date | null {
  const recurrence = reminder.recurrence;
  if (!recurrence) {
    return null;
  }

  if (recurrence.kind === 'interval') {
    if (!recurrence.intervalMs) {
      return null;
    }
    const base = new Date(reminder.datetime);
    const next = new Date(
      (Number.isNaN(base.getTime()) ? after.getTime() : base.getTime()) + recurrence.intervalMs
    );
    if (recurrence.endsAt && next.getTime() > new Date(recurrence.endsAt).getTime()) {
      return null;
    }
    return next;
  }

  if (recurrence.kind === 'daily') {
    if (recurrence.hour === undefined || recurrence.minute === undefined) {
      return null;
    }
    return nextDailyOccurrence(
      recurrence.hour,
      recurrence.minute,
      reminder.timezone,
      after
    );
  }

  if (recurrence.kind === 'weekly') {
    if (
      !recurrence.weekdays?.length ||
      recurrence.hour === undefined ||
      recurrence.minute === undefined
    ) {
      return null;
    }
    return nextWeeklyOccurrence(
      recurrence.weekdays,
      recurrence.hour,
      recurrence.minute,
      reminder.timezone,
      after
    );
  }

  return null;
}

export function nextDailyOccurrence(
  hour: number,
  minute: number,
  timezone: string,
  after: Date
): Date {
  const localNow = formatLocalIsoInTimeZone(after, timezone);
  const datePart = localNow.slice(0, 10);
  let candidate = zonedLocalDateTimeToUtc(
    `${datePart}T${pad2(hour)}:${pad2(minute)}:00`,
    timezone
  );

  if (candidate.getTime() <= after.getTime() + 1_000) {
    const nextDate = addDaysToDatePart(datePart, 1);
    candidate = zonedLocalDateTimeToUtc(
      `${nextDate}T${pad2(hour)}:${pad2(minute)}:00`,
      timezone
    );
  }

  return candidate;
}

export function nextWeeklyOccurrence(
  weekdays: number[],
  hour: number,
  minute: number,
  timezone: string,
  after: Date
): Date {
  const uniqueDays = [...new Set(weekdays)].sort((a, b) => a - b);
  let best: Date | null = null;

  for (let add = 0; add <= 8; add += 1) {
    const localNow = formatLocalIsoInTimeZone(after, timezone);
    const datePart = addDaysToDatePart(localNow.slice(0, 10), add);
    const probe = zonedLocalDateTimeToUtc(
      `${datePart}T${pad2(hour)}:${pad2(minute)}:00`,
      timezone
    );
    const weekday = getWeekdayInTimeZone(probe, timezone);
    if (!uniqueDays.includes(weekday)) {
      continue;
    }
    if (probe.getTime() <= after.getTime() + 1_000) {
      continue;
    }
    if (!best || probe.getTime() < best.getTime()) {
      best = probe;
    }
  }

  if (!best) {
    // Fallback: 7 days from daily next
    return nextDailyOccurrence(hour, minute, timezone, new Date(after.getTime() + 7 * 86_400_000));
  }

  return best;
}

function getWeekdayInTimeZone(date: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? 0;
}

function parseClock(
  hourRaw: string | undefined,
  minuteRaw: string | undefined,
  meridiemRaw: string | undefined
): { hour: number; minute: number } | null {
  if (hourRaw === undefined) {
    return null;
  }

  const rawHour = Number(hourRaw);
  const rawMinute = Number(minuteRaw ?? '0');
  const meridiem = meridiemRaw?.toLowerCase();

  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute) || rawMinute < 0 || rawMinute > 59) {
    return null;
  }

  let hour24: number;
  if (meridiem) {
    if (rawHour < 1 || rawHour > 12) {
      return null;
    }
    hour24 = meridiem === 'am' ? rawHour % 12 : rawHour === 12 ? 12 : rawHour + 12;
  } else if (rawHour >= 0 && rawHour <= 23) {
    hour24 = rawHour;
  } else {
    return null;
  }

  return { hour: hour24, minute: rawMinute };
}

function extractReason(message: string, stripPatterns: RegExp[]): string {
  let reason = message
    .replace(/^\s*(want\s+(a\s+)?)?reminder\s+(for\s+)?/i, '')
    .replace(/^\s*remind\s+me\s+(to\s+)?/i, '')
    .replace(/^\s*i\s+want\s+(a\s+)?reminder\s+(for\s+)?/i, '');

  for (const pattern of stripPatterns) {
    reason = reason.replace(pattern, ' ');
  }

  reason = reason
    .replace(/^\s*(to|for)\s+/i, '')
    .replace(/[.,!?]+$/g, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!reason) {
    reason = 'Reminder';
  }

  return reason.charAt(0).toUpperCase() + reason.slice(1);
}

function formatDuration(amount: number, unit: string): string {
  const normalized = unit.replace(/s$/i, '').toLowerCase();
  const label =
    normalized.startsWith('min')
      ? 'minute'
      : normalized.startsWith('hour') || normalized.startsWith('hr')
        ? 'hour'
        : 'day';
  return `${amount} ${label}${amount === 1 ? '' : 's'}`;
}

function formatClockLabel(hour: number, minute: number): string {
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${pad2(minute)} ${meridiem}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function addDaysToDatePart(datePart: string, days: number): string {
  const [year, month, day] = datePart.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
