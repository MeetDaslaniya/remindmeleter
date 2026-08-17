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
    tryParseYearly(message, timezone, now) ??
    tryParseMonthly(message, timezone, now) ??
    tryParseIntervalWindow(message, timezone, now) ??
    tryParseWeekly(message, timezone, now) ??
    tryParseBeforeOffsetDaily(message, timezone, now) ??
    tryParseEveryDayAt(message, timezone, now)
  );
}

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

/**
 * Monthly reminders, e.g.:
 * - Remind me every month on the 1st at 8 AM to pay rent
 * - Remind me monthly on the 15th at 9:00 PM to pay bills
 * - Every month on 1st at 8:00 AM …
 */
function tryParseMonthly(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  if (!/\bevery\s+month\b|\bmonthly\b/i.test(message)) {
    return null;
  }
  // Yearly phrases take precedence (handled earlier), but guard anyway.
  if (/\bevery\s+year\b|\byearly\b|\bannually\b/i.test(message)) {
    return null;
  }

  const dayMatch =
    message.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/i) ??
    message.match(/\bon\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (!dayMatch) {
    return null;
  }

  const dayOfMonth = Number(dayMatch[1]);
  if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return null;
  }

  const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const clock = timeMatch
    ? parseClock(timeMatch[1], timeMatch[2], timeMatch[3])
    : { hour: 0, minute: 0 };
  if (!clock) {
    return null;
  }
  const usedDefaultMidnight = !timeMatch;

  const firstAt = nextMonthlyOccurrence(
    dayOfMonth,
    clock.hour,
    clock.minute,
    timezone,
    now
  );

  const dayLabel = `${dayOfMonth}${ordinalSuffix(dayOfMonth)}`;
  const summary = usedDefaultMidnight
    ? `Every month on the ${dayLabel} at 12:00 AM`
    : `Every month on the ${dayLabel} at ${formatClockLabel(clock.hour, clock.minute)}`;

  const reason = extractReason(message, [
    /\bevery\s+month\b/i,
    /\bmonthly\b/i,
    /\bon\s+the\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
    /\bon\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
  ]);

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'monthly',
      dayOfMonth,
      hour: clock.hour,
      minute: clock.minute,
      summary,
    },
  };
}

/**
 * Yearly / birthday reminders, e.g.:
 * - Remind me on 13 september every year to celebrate with family
 * - Remind me on my birthday 13 september every year to celebrate with family
 * - Remind me on my birthday at 13 september every year …
 * - Remind me on my birthday(13 september) every year …
 * - Remind me every year on December 31st at 11:50 PM to watch the countdown
 */
function tryParseYearly(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  if (!/\bevery\s+year\b|\byearly\b|\bannually\b/i.test(message)) {
    return null;
  }

  const md = extractMonthDayFromMessage(message);
  if (!md) {
    return null;
  }

  const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  // Ignore "at 13 september" style — only treat as clock when hour looks like a time,
  // i.e. has :mm or am/pm, OR hour is followed by something that isn't a month name.
  let clock = { hour: 0, minute: 0 };
  let usedDefaultMidnight = true;
  if (timeMatch) {
    const afterAt = message.slice(message.toLowerCase().indexOf(timeMatch[0].toLowerCase()) + timeMatch[0].length);
    const looksLikeDateNotTime =
      !timeMatch[2] &&
      !timeMatch[3] &&
      /^\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
        afterAt
      );
    if (!looksLikeDateNotTime) {
      const parsed = parseClock(timeMatch[1], timeMatch[2], timeMatch[3]);
      if (parsed) {
        clock = parsed;
        usedDefaultMidnight = false;
      }
    }
  }

  const firstAt = nextYearlyOccurrence(
    md.month,
    md.day,
    clock.hour,
    clock.minute,
    timezone,
    now
  );

  const monthLabel = capitalize(
    Object.keys(MONTH_NAME_TO_INDEX).find(
      (k) => MONTH_NAME_TO_INDEX[k] === md.month && k.length > 3
    ) ?? String(md.month)
  );
  const summary = usedDefaultMidnight
    ? `Every year on ${md.day} ${monthLabel} at 12:00 AM`
    : `Every year on ${md.day} ${monthLabel} at ${formatClockLabel(clock.hour, clock.minute)}`;

  const reason = extractReason(message, [
    /\bon\s+my\s+birthday\b/i,
    /\bmy\s+birthday\b/i,
    /\bbirthday\s*/i,
    /\bevery\s+year\b/i,
    /\byearly\b/i,
    /\bannually\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
    /\bat\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
    /\b(?:on|for|at)\s+/i,
    /[()]/g,
  ]);

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'yearly',
      month: md.month,
      dayOfMonth: md.day,
      hour: clock.hour,
      minute: clock.minute,
      summary,
    },
  };
}

function extractMonthDayFromMessage(message: string): { month: number; day: number } | null {
  // birthday(13 september) / birthday (13 sept)
  const inParens = message.match(
    /\(\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s*\)/i
  );
  if (inParens) {
    return toMonthDay(Number(inParens[1]), inParens[2]);
  }

  // 13th september / 13 september
  const dayFirst = message.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/i
  );
  if (dayFirst) {
    return toMonthDay(Number(dayFirst[1]), dayFirst[2]);
  }

  // september 13th
  const monthFirst = message.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  );
  if (monthFirst) {
    return toMonthDay(Number(monthFirst[2]), monthFirst[1]);
  }

  return null;
}

function toMonthDay(day: number, monthName: string): { month: number; day: number } | null {
  const month = MONTH_NAME_TO_INDEX[monthName.toLowerCase()];
  if (!month || day < 1 || day > 31) {
    return null;
  }
  // Validate calendar day in a non-leap year for Feb 29 → still allow Feb 29
  const probeYear = 2024; // leap year so Feb 29 ok
  const probe = new Date(Date.UTC(probeYear, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { month, day };
}

/** Next occurrence of day-of-month at local hour:minute strictly after `after`. */
export function nextMonthlyOccurrence(
  dayOfMonth: number,
  hour: number,
  minute: number,
  timezone: string,
  after: Date
): Date {
  const localNow = formatLocalIsoInTimeZone(after, timezone);
  let year = Number(localNow.slice(0, 4));
  let month = Number(localNow.slice(5, 7));

  for (let i = 0; i < 14; i += 1) {
    const safeDay = clampDayForMonth(year, month, dayOfMonth);
    const candidate = zonedLocalDateTimeToUtc(
      `${year}-${pad2(month)}-${pad2(safeDay)}T${pad2(hour)}:${pad2(minute)}:00`,
      timezone
    );
    if (candidate.getTime() > after.getTime() + 1_000) {
      return candidate;
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  const safeDay = clampDayForMonth(year, month, dayOfMonth);
  return zonedLocalDateTimeToUtc(
    `${year}-${pad2(month)}-${pad2(safeDay)}T${pad2(hour)}:${pad2(minute)}:00`,
    timezone
  );
}

/** Next occurrence of month/day at local hour:minute strictly after `after`. */
export function nextYearlyOccurrence(
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string,
  after: Date
): Date {
  const localNow = formatLocalIsoInTimeZone(after, timezone);
  let year = Number(localNow.slice(0, 4));

  for (let i = 0; i < 6; i += 1) {
    const safeDay = clampDayForMonth(year, month, day);
    const candidate = zonedLocalDateTimeToUtc(
      `${year}-${pad2(month)}-${pad2(safeDay)}T${pad2(hour)}:${pad2(minute)}:00`,
      timezone
    );
    if (candidate.getTime() > after.getTime() + 1_000) {
      return candidate;
    }
    year += 1;
  }

  // Fallback — should be unreachable
  const safeDay = clampDayForMonth(year, month, day);
  return zonedLocalDateTimeToUtc(
    `${year}-${pad2(month)}-${pad2(safeDay)}T${pad2(hour)}:${pad2(minute)}:00`,
    timezone
  );
}

function clampDayForMonth(year: number, month: number, day: number): number {
  // Last day of month: day 0 of next month
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(day, last);
}

/** "every minute for next 5 minutes …" or "every 15 minutes 8 times …" or "every 2 hours until 8 PM" */
function tryParseIntervalWindow(
  message: string,
  timezone: string,
  now: Date
): RecurringParseResult | null {
  const match = message.match(
    /\bevery\s+(\d+)?\s*(minutes?|mins?|hours?|hrs?|days?)\b(?:\s+for\s+(?:the\s+)?next\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)|\s+(?:for\s+)?(\d+)\s*times?)?/i
  );
  if (!match) {
    return null;
  }

  // Prefer weekly / clock patterns when "every sunday at …" — handled elsewhere.
  if (/\bevery\s+(sun|mon|tue|wed|thu|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(message)) {
    return null;
  }
  if (/\bevery\s+(day|morning|evening|night|month|year)\b/i.test(message)) {
    return null;
  }

  const intervalAmount = match[1] ? Number(match[1]) : 1;
  const intervalUnit = match[2].toLowerCase();
  const intervalMs = (UNIT_MS[intervalUnit] ?? 0) * intervalAmount;
  if (!intervalMs || intervalAmount <= 0) {
    return null;
  }

  const firstAt = new Date(now.getTime() + intervalMs);
  let remainingCount: number | undefined;
  let endsAt: string | undefined;
  let summary: string;

  if (match[3] && match[4]) {
    // "for the next 4 hours"
    const windowAmount = Number(match[3]);
    const windowUnit = match[4].toLowerCase();
    const windowMs = (UNIT_MS[windowUnit] ?? 0) * windowAmount;
    if (!windowMs || windowAmount <= 0) {
      return null;
    }
    remainingCount = Math.max(1, Math.floor(windowMs / intervalMs));
    endsAt = new Date(now.getTime() + windowMs + 5_000).toISOString();
    summary = `Every ${formatDuration(intervalAmount, intervalUnit)} for the next ${formatDuration(windowAmount, windowUnit)} (${remainingCount} times)`;
  } else if (match[5]) {
    // "8 times" / "for 8 times"
    remainingCount = Number(match[5]);
    if (!Number.isFinite(remainingCount) || remainingCount <= 0) {
      return null;
    }
    remainingCount = Math.min(remainingCount, 500);
    endsAt = new Date(now.getTime() + intervalMs * remainingCount + 5_000).toISOString();
    summary = `Every ${formatDuration(intervalAmount, intervalUnit)} (${remainingCount} times)`;
  } else {
    // "until 8 PM" / "till 8:00pm"
    const until = resolveUntilClock(message, timezone, now);
    if (!until) {
      return null;
    }
    if (firstAt.getTime() > until.endsAt.getTime()) {
      return null;
    }

    remainingCount = 0;
    let cursor = firstAt.getTime();
    while (cursor <= until.endsAt.getTime() && remainingCount < 500) {
      remainingCount += 1;
      cursor += intervalMs;
    }
    if (remainingCount <= 0) {
      return null;
    }

    endsAt = new Date(until.endsAt.getTime() + 5_000).toISOString();
    summary = `Every ${formatDuration(intervalAmount, intervalUnit)} until ${formatClockLabel(until.hour, until.minute)} (${remainingCount} times)`;
  }

  const reason = extractReason(message, [
    /\bevery\s+(\d+)?\s*(minutes?|mins?|hours?|hrs?|days?)\b/i,
    /\bfor\s+(?:the\s+)?next\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?)\b/i,
    /\b(?:for\s+)?\d+\s*times?\b/i,
    /\b(?:until|till)\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
  ]);

  return {
    reason,
    datetimeUtc: firstAt.toISOString(),
    timezone,
    recurrence: {
      kind: 'interval',
      intervalMs,
      remainingCount,
      totalCount: remainingCount,
      endsAt,
      summary,
    },
  };
}

/** Resolve "until 8 PM" to the next local clock instant (today if still ahead, else tomorrow). */
function resolveUntilClock(
  message: string,
  timezone: string,
  now: Date
): { endsAt: Date; hour: number; minute: number } | null {
  const match = message.match(/\b(?:until|till)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) {
    return null;
  }

  const clock = parseClock(match[1], match[2], match[3]);
  if (!clock) {
    return null;
  }

  const localNow = formatLocalIsoInTimeZone(now, timezone);
  const datePart = localNow.slice(0, 10);
  let endsAt = zonedLocalDateTimeToUtc(
    `${datePart}T${pad2(clock.hour)}:${pad2(clock.minute)}:00`,
    timezone
  );

  if (endsAt.getTime() <= now.getTime() + 30_000) {
    const nextDay = addDaysToDatePart(datePart, 1);
    endsAt = zonedLocalDateTimeToUtc(
      `${nextDay}T${pad2(clock.hour)}:${pad2(clock.minute)}:00`,
      timezone
    );
  }

  return { endsAt, hour: clock.hour, minute: clock.minute };
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
  const window = parseForNextWindow(message);

  let summary = usedDefaultMidnight
    ? `Every ${dayName} at 12:00 AM (midnight)`
    : `Every ${dayName} at ${formatClockLabel(clock.hour, clock.minute)}`;

  let remainingCount: number | undefined;
  let endsAt: string | undefined;
  if (window) {
    endsAt = new Date(now.getTime() + window.windowMs + 5_000).toISOString();
    remainingCount = countOccurrencesUntil(
      'weekly',
      clock.hour,
      clock.minute,
      timezone,
      firstAt,
      new Date(endsAt),
      [weekday]
    );
    summary = `${summary} for the next ${formatDuration(window.amount, window.unit)} (${remainingCount} times)`;
  }

  const reason = extractReason(message, [
    /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
    /\bfor\s+(?:the\s+)?next\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/i,
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
      ...(remainingCount !== undefined
        ? { remainingCount, totalCount: remainingCount }
        : {}),
      ...(endsAt ? { endsAt } : {}),
    },
  };
}

/** "every day at 9AM …" optionally "for the next 30 days" */
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
  const window = parseForNextWindow(message);

  let summary = usedDefaultMidnight
    ? 'Every day at 12:00 AM (midnight)'
    : `Every day at ${formatClockLabel(clock.hour, clock.minute)}`;

  let remainingCount: number | undefined;
  let endsAt: string | undefined;
  if (window) {
    endsAt = new Date(now.getTime() + window.windowMs + 5_000).toISOString();
    remainingCount = countOccurrencesUntil(
      'daily',
      clock.hour,
      clock.minute,
      timezone,
      firstAt,
      new Date(endsAt)
    );
    summary = `${summary} for the next ${formatDuration(window.amount, window.unit)} (${remainingCount} times)`;
  }

  const reason = extractReason(message, [
    /\bevery\s+day\b/i,
    /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
    /\bfor\s+(?:the\s+)?next\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/i,
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
      ...(remainingCount !== undefined
        ? { remainingCount, totalCount: remainingCount }
        : {}),
      ...(endsAt ? { endsAt } : {}),
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

  if (recurrence.kind === 'monthly') {
    if (
      recurrence.dayOfMonth === undefined ||
      recurrence.hour === undefined ||
      recurrence.minute === undefined
    ) {
      return null;
    }
    return nextMonthlyOccurrence(
      recurrence.dayOfMonth,
      recurrence.hour,
      recurrence.minute,
      reminder.timezone,
      after
    );
  }

  if (recurrence.kind === 'yearly') {
    if (
      recurrence.month === undefined ||
      recurrence.dayOfMonth === undefined ||
      recurrence.hour === undefined ||
      recurrence.minute === undefined
    ) {
      return null;
    }
    return nextYearlyOccurrence(
      recurrence.month,
      recurrence.dayOfMonth,
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
    .replace(/^\s*ping\s+me\s+(to\s+)?/i, '')
    .replace(/^\s*nag\s+me\s+(to\s+)?/i, '')
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

function parseForNextWindow(
  message: string
): { amount: number; unit: string; windowMs: number } | null {
  const match = message.match(
    /\bfor\s+(?:the\s+)?next\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/i
  );
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  let windowMs = 0;
  if (unit.startsWith('min')) {
    windowMs = amount * 60_000;
  } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
    windowMs = amount * 3_600_000;
  } else if (unit.startsWith('day')) {
    windowMs = amount * 86_400_000;
  } else if (unit.startsWith('week')) {
    windowMs = amount * 7 * 86_400_000;
  } else if (unit.startsWith('month')) {
    windowMs = amount * 30 * 86_400_000;
  }

  if (!windowMs) {
    return null;
  }

  return { amount, unit, windowMs };
}

/**
 * Count how many occurrences fit from firstAt through endsAt (inclusive of first).
 */
function countOccurrencesUntil(
  kind: 'daily' | 'weekly',
  hour: number,
  minute: number,
  timezone: string,
  firstAt: Date,
  endsAt: Date,
  weekdays?: number[]
): number {
  let count = 0;
  let cursor = firstAt;

  while (cursor.getTime() <= endsAt.getTime() && count < 1000) {
    count += 1;
    cursor =
      kind === 'daily'
        ? nextDailyOccurrence(hour, minute, timezone, cursor)
        : nextWeeklyOccurrence(weekdays ?? [], hour, minute, timezone, cursor);
  }

  return Math.max(1, count);
}

function formatDuration(amount: number, unit: string): string {
  const normalized = unit.replace(/s$/i, '').toLowerCase();
  const label =
    normalized.startsWith('min')
      ? 'minute'
      : normalized.startsWith('hour') || normalized.startsWith('hr')
        ? 'hour'
        : normalized.startsWith('week')
          ? 'week'
          : normalized.startsWith('month')
            ? 'month'
            : 'day';
  return `${amount} ${label}${amount === 1 ? '' : 's'}`;
}

function ordinalSuffix(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
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
