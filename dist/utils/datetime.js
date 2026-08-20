"use strict";
/**
 * Timezone helpers using Intl only (no extra date libraries).
 * `localDateTime` means wall-clock in `timeZone`, without offset, e.g. 2026-07-28T11:56:00
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripTimezoneSuffix = stripTimezoneSuffix;
exports.getTimeZoneOffsetMs = getTimeZoneOffsetMs;
exports.zonedLocalDateTimeToUtc = zonedLocalDateTimeToUtc;
exports.formatInTimeZone = formatInTimeZone;
exports.formatLocalIsoInTimeZone = formatLocalIsoInTimeZone;
exports.startOfZonedDay = startOfZonedDay;
exports.zonedDateKey = zonedDateKey;
exports.resolveToUtcDate = resolveToUtcDate;
exports.tryParseRelativeReminder = tryParseRelativeReminder;
exports.tryParseExplicitClockReminder = tryParseExplicitClockReminder;
exports.tryParseCalendarDateReminder = tryParseCalendarDateReminder;
exports.tryParseWeekdayReminder = tryParseWeekdayReminder;
exports.addDaysToDatePart = addDaysToDatePart;
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;
function stripTimezoneSuffix(value) {
    return value
        .trim()
        .replace(' ', 'T')
        .replace(/Z$/i, '')
        .replace(/([+-]\d{2}:?\d{2})$/, '');
}
function getTimeZoneOffsetMs(timeZone, date) {
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
    const map = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    }
    const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
    const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second));
    return asUtc - date.getTime();
}
/** Convert wall-clock local time in `timeZone` to an absolute UTC Date. */
function zonedLocalDateTimeToUtc(localDateTime, timeZone) {
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
function formatInTimeZone(date, timeZone, options = {
    dateStyle: 'medium',
    timeStyle: 'short',
}) {
    return date.toLocaleString('en-IN', { timeZone, ...options });
}
function formatLocalIsoInTimeZone(date, timeZone) {
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
    const map = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    }
    const hour = map.hour === '24' ? '00' : map.hour;
    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}`;
}
/** Start of calendar day (00:00:00) in `timeZone`, as a UTC Date. */
function startOfZonedDay(timeZone, at = new Date()) {
    const localIso = formatLocalIsoInTimeZone(at, timeZone);
    const day = localIso.slice(0, 10);
    return zonedLocalDateTimeToUtc(`${day}T00:00:00`, timeZone);
}
/** Calendar date YYYY-MM-DD in `timeZone`. */
function zonedDateKey(timeZone, at = new Date()) {
    return formatLocalIsoInTimeZone(at, timeZone).slice(0, 10);
}
function resolveToUtcDate(datetime, timeZone) {
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
/**
 * Deterministic parser for phrases like:
 * - "in 2 minutes to drink water"
 * - "after 2 hours to submit the assignment"
 * - "ping me after 2 hours …"
 */
function tryParseRelativeReminder(message, timezone, now = new Date()) {
    const relative = message.match(/\b(?:in|after)\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i);
    if (!relative) {
        return null;
    }
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0) {
        return null;
    }
    const ms = unit.startsWith('min')
        ? amount * 60_000
        : unit.startsWith('hour') || unit.startsWith('hr')
            ? amount * 3_600_000
            : amount * 86_400_000;
    const runAt = new Date(now.getTime() + ms);
    let reason = message
        .replace(/^\s*(?:remind\s+me|ping\s+me|nag\s+me)\s+/i, '')
        .replace(/\b(?:in|after)\s+\d+\s*(minutes?|mins?|hours?|hrs?|days?)\b/i, '')
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
 * - "remind me at 2:10 to drink water"   (today / next day if past)
 * - "remind me tomorrow at 2:10 pm …"
 * - "remind me today at 9 am …"
 *
 * Does NOT handle calendar dates ("15th September") or weekdays ("next Monday")
 * — those have dedicated parsers so we don't incorrectly force "today".
 */
function tryParseExplicitClockReminder(message, timezone, now = new Date()) {
    // Recurring phrases are handled by tryParseRecurringReminder.
    if (/\bevery\b/i.test(message) ||
        /\b(?:\d+\s*(?:minutes?|mins?|hours?|hrs?)\s+before|before\s+\d+\s*(?:minutes?|mins?|hours?|hrs?))\b/i.test(message)) {
        return null;
    }
    // Leave calendar dates and weekday phrases to other parsers / AI.
    if (hasCalendarMonthReference(message) || hasWeekdayReference(message)) {
        return null;
    }
    const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (!timeMatch) {
        return null;
    }
    const parsedTime = parseClockParts(timeMatch[1], timeMatch[2], timeMatch[3]);
    if (!parsedTime) {
        return null;
    }
    const localNow = formatLocalIsoInTimeZone(now, timezone);
    let datePart = localNow.slice(0, 10);
    if (/\btomorrow\b/i.test(message)) {
        datePart = addDaysToDatePart(datePart, 1);
    }
    else if (!/\b(?:today|tonight)\b/i.test(message)) {
        // Plain "at 6:30 pm" with no day word → today, or tomorrow if already past.
    }
    let localCandidate = `${datePart}T${pad2(parsedTime.hour24)}:${pad2(parsedTime.minute)}:00`;
    let runAt = zonedLocalDateTimeToUtc(localCandidate, timezone);
    // If this clock time already passed today (and not explicitly "tomorrow"), roll to next day.
    if (!/\btomorrow\b/i.test(message) &&
        runAt.getTime() <= now.getTime() + 30_000) {
        const nextDatePart = addDaysToDatePart(datePart, 1);
        localCandidate = `${nextDatePart}T${pad2(parsedTime.hour24)}:${pad2(parsedTime.minute)}:00`;
        runAt = zonedLocalDateTimeToUtc(localCandidate, timezone);
    }
    const reason = extractReminderReason(message, [
        /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
        /\b(?:today|tonight|tomorrow)\b/i,
    ]);
    return {
        reason,
        datetimeUtc: runAt.toISOString(),
        timezone,
    };
}
/**
 * "Ping me on 15th September at 6:30 PM to pay the electricity bill"
 * "Set a reminder for December 31st at 11:50 PM to watch the countdown"
 * "Remind me on 2026-09-15 at 18:30 …"
 */
function tryParseCalendarDateReminder(message, timezone, now = new Date()) {
    if (/\bevery\b/i.test(message)) {
        return null;
    }
    const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (!timeMatch) {
        return null;
    }
    const parsedTime = parseClockParts(timeMatch[1], timeMatch[2], timeMatch[3]);
    if (!parsedTime) {
        return null;
    }
    const datePart = extractCalendarDatePart(message, timezone, now);
    if (!datePart) {
        return null;
    }
    const localCandidate = `${datePart}T${pad2(parsedTime.hour24)}:${pad2(parsedTime.minute)}:00`;
    const runAt = zonedLocalDateTimeToUtc(localCandidate, timezone);
    if (runAt.getTime() <= now.getTime() + 30_000) {
        return null; // past — let AI decide / reject
    }
    const reason = extractReminderReason(message, [
        /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
        /\b(?:on|for)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
        /\b(?:on|for)\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
        /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
        /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
        /\b\d{4}-\d{2}-\d{2}\b/,
        /\b(?:set\s+a\s+reminder\s+for|ping\s+me\s+on|remind\s+me\s+on)\b/i,
    ]);
    return {
        reason,
        datetimeUtc: runAt.toISOString(),
        timezone,
    };
}
/**
 * "Remind me next Monday at 9:00 AM about the team meeting"
 * "Remind me this Friday at 5 pm to call mom"
 */
function tryParseWeekdayReminder(message, timezone, now = new Date()) {
    if (/\bevery\b/i.test(message) || hasCalendarMonthReference(message)) {
        return null;
    }
    const weekdayMatch = message.match(/\b(?:next|this|on)\s+(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i);
    if (!weekdayMatch) {
        return null;
    }
    const timeMatch = message.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (!timeMatch) {
        return null;
    }
    const parsedTime = parseClockParts(timeMatch[1], timeMatch[2], timeMatch[3]);
    if (!parsedTime) {
        return null;
    }
    const targetWeekday = WEEKDAY_NAME_TO_INDEX[weekdayMatch[1].toLowerCase()];
    if (targetWeekday === undefined) {
        return null;
    }
    const preferNext = /^next$/i.test(weekdayMatch[0].trim().split(/\s+/)[0] ?? '');
    const datePart = nextWeekdayDatePart(now, timezone, targetWeekday, preferNext);
    const localCandidate = `${datePart}T${pad2(parsedTime.hour24)}:${pad2(parsedTime.minute)}:00`;
    let runAt = zonedLocalDateTimeToUtc(localCandidate, timezone);
    // If "this Monday" already passed earlier today, jump a week.
    if (runAt.getTime() <= now.getTime() + 30_000) {
        const later = addDaysToDatePart(datePart, 7);
        runAt = zonedLocalDateTimeToUtc(`${later}T${pad2(parsedTime.hour24)}:${pad2(parsedTime.minute)}:00`, timezone);
    }
    const reason = extractReminderReason(message, [
        /\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i,
        /\b(?:next|this|on)\s+(?:monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i,
        /\babout\b/i,
    ]);
    return {
        reason,
        datetimeUtc: runAt.toISOString(),
        timezone,
    };
}
const WEEKDAY_NAME_TO_INDEX = {
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
const MONTH_NAME_TO_INDEX = {
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
function hasCalendarMonthReference(message) {
    return (/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(message) || /\b\d{4}-\d{2}-\d{2}\b/.test(message));
}
function hasWeekdayReference(message) {
    return /\b(?:next|this|on)\s+(?:monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i.test(message);
}
function parseClockParts(hourRaw, minuteRaw, meridiemRaw) {
    const rawHour = Number(hourRaw);
    const rawMinute = Number(minuteRaw ?? '0');
    const meridiem = meridiemRaw?.toLowerCase();
    if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute) || rawMinute < 0 || rawMinute > 59) {
        return null;
    }
    let hour24;
    if (meridiem) {
        if (rawHour < 1 || rawHour > 12) {
            return null;
        }
        hour24 = meridiem === 'am' ? rawHour % 12 : rawHour === 12 ? 12 : rawHour + 12;
    }
    else {
        if (rawHour < 0 || rawHour > 23) {
            return null;
        }
        hour24 = rawHour;
    }
    return { hour24, minute: rawMinute };
}
function extractCalendarDatePart(message, timezone, now) {
    const iso = message.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (iso) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    // 15th September / 15 September / 15th of September [2026]
    const dayFirst = message.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?\b/i);
    if (dayFirst) {
        return buildFutureDatePart(Number(dayFirst[1]), MONTH_NAME_TO_INDEX[dayFirst[2].toLowerCase()], dayFirst[3] ? Number(dayFirst[3]) : undefined, timezone, now);
    }
    // September 15th / September 15 [2026]
    const monthFirst = message.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/i);
    if (monthFirst) {
        return buildFutureDatePart(Number(monthFirst[2]), MONTH_NAME_TO_INDEX[monthFirst[1].toLowerCase()], monthFirst[3] ? Number(monthFirst[3]) : undefined, timezone, now);
    }
    return null;
}
function buildFutureDatePart(day, month, yearHint, timezone, now) {
    if (!month || day < 1 || day > 31) {
        return null;
    }
    const localNow = formatLocalIsoInTimeZone(now, timezone);
    const currentYear = Number(localNow.slice(0, 4));
    let year = yearHint ?? currentYear;
    let candidate = `${year}-${pad2(month)}-${pad2(day)}`;
    // If no year given and that date/time already passed this year, use next year
    // (date-only check: if calendar day is before today in local TZ).
    if (!yearHint) {
        const todayKey = localNow.slice(0, 10);
        if (candidate < todayKey) {
            year += 1;
            candidate = `${year}-${pad2(month)}-${pad2(day)}`;
        }
    }
    // Validate real calendar day (e.g. reject Feb 31)
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
        return null;
    }
    return candidate;
}
function nextWeekdayDatePart(now, timezone, targetWeekday, preferNext) {
    const localNow = formatLocalIsoInTimeZone(now, timezone);
    const todayKey = localNow.slice(0, 10);
    const noonUtc = zonedLocalDateTimeToUtc(`${todayKey}T12:00:00`, timezone);
    const currentWeekday = getWeekdayInTimeZone(noonUtc, timezone);
    let delta = (targetWeekday - currentWeekday + 7) % 7;
    if (preferNext) {
        // "next Monday" = upcoming Monday; if today is Monday, still go +7
        if (delta === 0) {
            delta = 7;
        }
    }
    else if (delta === 0) {
        // "this Monday" / "on Monday" — today is fine; time-past handled by caller
        delta = 0;
    }
    return addDaysToDatePart(todayKey, delta);
}
function getWeekdayInTimeZone(date, timeZone) {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
    const map = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };
    return map[weekday] ?? 0;
}
function extractReminderReason(message, stripPatterns) {
    let reason = message
        .replace(/^\s*(?:remind\s+me|ping\s+me|set\s+a\s+reminder)\s+/i, '')
        .replace(/^\s*(?:to|for|about)\s+/i, '');
    for (const pattern of stripPatterns) {
        reason = reason.replace(pattern, ' ');
    }
    reason = reason
        .replace(/\b(?:on|for|to|about|at)\s*$/i, '')
        .replace(/^\s*(?:to|for|about|on)\s+/i, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/[.,!?]+$/g, '')
        .trim();
    // Prefer trailing "to …" / "about …" if still present in original
    const toMatch = message.match(/\b(?:to|about)\s+(.+)$/i);
    if (toMatch?.[1]) {
        const cleaned = toMatch[1]
            .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i, '')
            .replace(/[.,!?]+$/g, '')
            .trim();
        if (cleaned.length >= 2) {
            reason = cleaned;
        }
    }
    if (!reason) {
        reason = 'Reminder';
    }
    return reason.charAt(0).toUpperCase() + reason.slice(1);
}
function addDaysToDatePart(datePart, days) {
    const [year, month, day] = datePart.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day + days));
    const y = d.getUTCFullYear();
    const m = pad2(d.getUTCMonth() + 1);
    const dd = pad2(d.getUTCDate());
    return `${y}-${m}-${dd}`;
}
function pad2(value) {
    return String(value).padStart(2, '0');
}
//# sourceMappingURL=datetime.js.map