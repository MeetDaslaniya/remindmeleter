import { Reminder, ReminderRecurrence } from '../types';
export interface RecurringParseResult {
    reason: string;
    datetimeUtc: string;
    timezone: string;
    recurrence: ReminderRecurrence;
}
/**
 * Deterministic parsers for recurring reminders, e.g.:
 * - every minute for next 5 minutes to drink water
 * - every sunday at 6AM to play cricket
 * - 15 min before … at 9:00AM (daily offset)
 */
export declare function tryParseRecurringReminder(message: string, timezone: string, now?: Date): RecurringParseResult | null;
/** Next occurrence of day-of-month at local hour:minute strictly after `after`. */
export declare function nextMonthlyOccurrence(dayOfMonth: number, hour: number, minute: number, timezone: string, after: Date): Date;
/** Next occurrence of month/day at local hour:minute strictly after `after`. */
export declare function nextYearlyOccurrence(month: number, day: number, hour: number, minute: number, timezone: string, after: Date): Date;
export declare function computeNextOccurrence(reminder: Reminder, after: Date): Date | null;
export declare function nextDailyOccurrence(hour: number, minute: number, timezone: string, after: Date): Date;
export declare function nextWeeklyOccurrence(weekdays: number[], hour: number, minute: number, timezone: string, after: Date): Date;
//# sourceMappingURL=recurrence.d.ts.map