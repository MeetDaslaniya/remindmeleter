/**
 * Timezone helpers using Intl only (no extra date libraries).
 * `localDateTime` means wall-clock in `timeZone`, without offset, e.g. 2026-07-28T11:56:00
 */

const LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

export function stripTimezoneSuffix(value: string): string {
  return value
    .trim()
    .replace(' ', 'T')
    .replace(/Z$/i, '')
    .replace(/([+-]\d{2}:?\d{2})$/, '');
}

export function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second)
  );

  return asUtc - date.getTime();
}

/** Convert wall-clock local time in `timeZone` to an absolute UTC Date. */
export function zonedLocalDateTimeToUtc(localDateTime: string, timeZone: string): Date {
  const normalized = stripTimezoneSuffix(localDateTime);
  const match = normalized.match(LOCAL_DATETIME_RE);
  if (!match) {
    throw new Error(`Invalid local datetime: ${localDateTime}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  // Refine offset (DST-safe) a few times
  for (let i = 0; i < 3; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(timeZone, new Date(utcMs));
    utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs;
  }

  return new Date(utcMs);
}

export function formatInTimeZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  }
): string {
  return date.toLocaleString('en-IN', { timeZone, ...options });
}

export function formatLocalIsoInTimeZone(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const hour = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}`;
}

export function resolveToUtcDate(datetime: string, timeZone: string): Date {
  const trimmed = datetime.trim();

  // Already an absolute instant
  if (/Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const absolute = new Date(trimmed);
    if (Number.isNaN(absolute.getTime())) {
      throw new Error(`Invalid absolute datetime: ${datetime}`);
    }
    return absolute;
  }

  return zonedLocalDateTimeToUtc(trimmed, timeZone);
}

export interface RelativeParseResult {
  reason: string;
  datetimeUtc: string;
  timezone: string;
}

export interface ExplicitClockParseResult {
  reason: string;
  datetimeUtc: string;
  timezone: string;
}

/**
 * Deterministic parser for phrases like "in 2 minutes to drink water".
 * Returns null when the message is not a simple relative reminder.
 */
export function tryParseRelativeReminder(
  message: string,
  timezone: string,
  now: Date = new Date()
): RelativeParseResult | null {
  const relative = message.match(
    /\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i
  );
  if (!relative) {
    return null;
  }

  const amount = Number(relative[1]);
  const unit = relative[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const ms =
    unit.startsWith('min')
      ? amount * 60_000
      : unit.startsWith('hour') || unit.startsWith('hr')
        ? amount * 3_600_000
        : amount * 86_400_000;

  const runAt = new Date(now.getTime() + ms);

  let reason = message
    .replace(/^\s*remind\s+me\s+/i, '')
    .replace(/\bin\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?)\b/i, '')
    .replace(/^\s*to\s+/i, '')
    .replace(/[.,!?]+$/g, '')
    .trim();

  if (!reason) {
    reason = 'Reminder';
  }

  return {
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
    datetimeUtc: runAt.toISOString(),
    timezone,
  };
}

/**
 * Deterministic parser for phrases like:
 * - "remind me at 2:10 to drink water"   (24-hour when AM/PM omitted)
 * - "remind me at 2:10 pm to drink water" (12-hour when AM/PM provided)
 */
export function tryParseExplicitClockReminder(
  message: string,
  timezone: string,
  now: Date = new Date()
): ExplicitClockParseResult | null {
  // Recurring phrases are handled by tryParseRecurringReminder.
  if (/\bevery\b/i.test(message) || /\b(?:\d+\s*(?:minutes?|mins?|hours?|hrs?)\s+before|before\s+\d+\s*(?:minutes?|mins?|hours?|hrs?))\b/i.test(message)) {
    return null;
  }

  const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!timeMatch) {
    return null;
  }

  const rawHour = Number(timeMatch[1]);
  const rawMinute = Number(timeMatch[2] ?? '0');
  const meridiem = timeMatch[3]?.toLowerCase();

  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute) || rawMinute < 0 || rawMinute > 59) {
    return null;
  }

  let hour24: number;
  if (meridiem) {
    // 12-hour clock when AM/PM is present
    if (rawHour < 1 || rawHour > 12) {
      return null;
    }
    hour24 =
      meridiem === 'am'
        ? rawHour % 12
        : rawHour === 12
          ? 12
          : rawHour + 12;
  } else {
    // 24-hour clock when AM/PM is omitted
    if (rawHour < 0 || rawHour > 23) {
      return null;
    }
    hour24 = rawHour;
  }

  const localNow = formatLocalIsoInTimeZone(now, timezone);
  const datePart = localNow.slice(0, 10);

  let localCandidate = `${datePart}T${pad2(hour24)}:${pad2(rawMinute)}:00`;
  let runAt = zonedLocalDateTimeToUtc(localCandidate, timezone);

  // If this clock time already passed today, schedule next day.
  if (runAt.getTime() <= now.getTime() + 30_000) {
    const nextDatePart = addDaysToDatePart(datePart, 1);
    localCandidate = `${nextDatePart}T${pad2(hour24)}:${pad2(rawMinute)}:00`;
    runAt = zonedLocalDateTimeToUtc(localCandidate, timezone);
  }

  let reason =
    message.match(/\bto\s+(.+)$/i)?.[1]?.trim() ??
    message
      .replace(/^\s*remind\s+me\s+/i, '')
      .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i, '')
      .replace(/[.,!?]+$/g, '')
      .trim();

  if (!reason) {
    reason = 'Reminder';
  }

  return {
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
    datetimeUtc: runAt.toISOString(),
    timezone,
  };
}

function addDaysToDatePart(datePart: string, days: number): string {
  const [year, month, day] = datePart.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${y}-${m}-${dd}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
