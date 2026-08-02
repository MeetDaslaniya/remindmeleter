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
 * Deterministic parser for phrases like "in 2 minutes to drink water".
 * Returns null when the message is not a simple relative reminder.
 */
export declare function tryParseRelativeReminder(message: string, timezone: string, now?: Date): RelativeParseResult | null;
/**
 * Deterministic parser for phrases like:
 * - "remind me at 2:10 to drink water"   (24-hour when AM/PM omitted)
 * - "remind me at 2:10 pm to drink water" (12-hour when AM/PM provided)
 */
export declare function tryParseExplicitClockReminder(message: string, timezone: string, now?: Date): ExplicitClockParseResult | null;
//# sourceMappingURL=datetime.d.ts.map