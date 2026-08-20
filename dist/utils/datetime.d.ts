/**
 * Timezone helpers using Intl only (no extra date libraries).
 * `localDateTime` means wall-clock in `timeZone`, without offset, e.g. 2026-07-28T11:56:00
 */
export declare function stripTimezoneSuffix(value: string): string;
export declare function getTimeZoneOffsetMs(timeZone: string, date: Date): number;
/** Convert wall-clock local time in `timeZone` to an absolute UTC Date. */
export declare function zonedLocalDateTimeToUtc(localDateTime: string, timeZone: string): Date;
export declare function formatInTimeZone(date: Date, timeZone: string, options?: Intl.DateTimeFormatOptions): string;
export declare function formatLocalIsoInTimeZone(date: Date, timeZone: string): string;
/** Start of calendar day (00:00:00) in `timeZone`, as a UTC Date. */
export declare function startOfZonedDay(timeZone: string, at?: Date): Date;
/** Calendar date YYYY-MM-DD in `timeZone`. */
export declare function zonedDateKey(timeZone: string, at?: Date): string;
export declare function resolveToUtcDate(datetime: string, timeZone: string): Date;
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
 * Deterministic parser for phrases like:
 * - "in 2 minutes to drink water"
 * - "after 2 hours to submit the assignment"
 * - "ping me after 2 hours …"
 */
export declare function tryParseRelativeReminder(message: string, timezone: string, now?: Date): RelativeParseResult | null;
/**
 * Deterministic parser for phrases like:
 * - "remind me at 2:10 to drink water"   (today / next day if past)
 * - "remind me tomorrow at 2:10 pm …"
 * - "remind me today at 9 am …"
 *
 * Does NOT handle calendar dates ("15th September") or weekdays ("next Monday")
 * — those have dedicated parsers so we don't incorrectly force "today".
 */
export declare function tryParseExplicitClockReminder(message: string, timezone: string, now?: Date): ExplicitClockParseResult | null;
/**
 * "Ping me on 15th September at 6:30 PM to pay the electricity bill"
 * "Set a reminder for December 31st at 11:50 PM to watch the countdown"
 * "Remind me on 2026-09-15 at 18:30 …"
 */
export declare function tryParseCalendarDateReminder(message: string, timezone: string, now?: Date): ExplicitClockParseResult | null;
/**
 * "Remind me next Monday at 9:00 AM about the team meeting"
 * "Remind me this Friday at 5 pm to call mom"
 */
export declare function tryParseWeekdayReminder(message: string, timezone: string, now?: Date): ExplicitClockParseResult | null;
export declare function addDaysToDatePart(datePart: string, days: number): string;
//# sourceMappingURL=datetime.d.ts.map