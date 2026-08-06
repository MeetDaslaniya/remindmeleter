import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { config } from '../config';
import { ParsedReminder } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import {
  formatLocalIsoInTimeZone,
  resolveToUtcDate,
  tryParseCalendarDateReminder,
  tryParseExplicitClockReminder,
  tryParseRelativeReminder,
  tryParseWeekdayReminder,
} from '../utils/datetime';
import { tryParseRecurringReminder } from '../utils/recurrence';

const parsedReminderSchema = z.object({
  reason: z.string().min(1),
  datetime: z.string().min(1),
  timezone: z.string().min(1),
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export class AiService {
  private readonly client: AxiosInstance;
  private readonly model: string;
  private readonly defaultTimezone: string;

  constructor(
    apiUrl: string = config.AI_API_URL,
    apiKey: string = config.AI_API_KEY,
    model: string = config.AI_MODEL,
    defaultTimezone: string = config.DEFAULT_TIMEZONE
  ) {
    this.client = axios.create({
      baseURL: apiUrl.replace(/\/$/, ''),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    this.model = model;
    this.defaultTimezone = defaultTimezone;
  }

  async parseReminder(message: string, referenceDate: Date = new Date()): Promise<ParsedReminder | null> {
    const recurring = tryParseRecurringReminder(message, this.defaultTimezone, referenceDate);
    if (recurring) {
      logger.info('Parsed recurring reminder without AI', {
        reason: recurring.reason,
        datetime: recurring.datetimeUtc,
        recurrence: recurring.recurrence,
      });
      return {
        reason: recurring.reason,
        datetime: recurring.datetimeUtc,
        timezone: recurring.timezone,
        recurrence: recurring.recurrence,
      };
    }

    // Prefer deterministic math for relative times — LLMs often mix UTC/local.
    const relative = tryParseRelativeReminder(message, this.defaultTimezone, referenceDate);
    if (relative) {
      logger.info('Parsed relative reminder without AI', relative);
      return {
        reason: relative.reason,
        datetime: relative.datetimeUtc,
        timezone: relative.timezone,
      };
    }

    const calendarDate = tryParseCalendarDateReminder(
      message,
      this.defaultTimezone,
      referenceDate
    );
    if (calendarDate) {
      logger.info('Parsed calendar-date reminder without AI', calendarDate);
      return {
        reason: calendarDate.reason,
        datetime: calendarDate.datetimeUtc,
        timezone: calendarDate.timezone,
      };
    }

    const weekday = tryParseWeekdayReminder(message, this.defaultTimezone, referenceDate);
    if (weekday) {
      logger.info('Parsed weekday reminder without AI', weekday);
      return {
        reason: weekday.reason,
        datetime: weekday.datetimeUtc,
        timezone: weekday.timezone,
      };
    }

    const explicitClock = tryParseExplicitClockReminder(
      message,
      this.defaultTimezone,
      referenceDate
    );
    if (explicitClock) {
      logger.info('Parsed explicit clock reminder without AI', explicitClock);
      return {
        reason: explicitClock.reason,
        datetime: explicitClock.datetimeUtc,
        timezone: explicitClock.timezone,
      };
    }

    const systemPrompt = this.buildSystemPrompt(referenceDate);

    try {
      const { data } = await this.client.post<ChatCompletionResponse>('/chat/completions', {
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        logger.warn('AI returned empty content');
        return null;
      }

      return this.parseAiContent(content, referenceDate);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('AI parse failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('AI service unavailable', 502, 'AI_SERVICE_ERROR');
    }
  }

  private buildSystemPrompt(referenceDate: Date): string {
    const localNow = formatLocalIsoInTimeZone(referenceDate, this.defaultTimezone);

    return [
      'You are a reminder parsing assistant.',
      'Extract a structured reminder from the user message.',
      'Respond with ONLY valid JSON in this shape:',
      '{"reason":"string","datetime":"YYYY-MM-DDTHH:mm:ss","timezone":"IANA timezone"}',
      '',
      `Current UTC instant: ${referenceDate.toISOString()}`,
      `Current local datetime in ${this.defaultTimezone}: ${localNow}`,
      `Default timezone: ${this.defaultTimezone}`,
      '',
      'CRITICAL timezone rules:',
      `- datetime MUST be the wall-clock time in the user's timezone (${this.defaultTimezone}), NOT UTC.`,
      '- Example: if local now is 11:54 and user says "in 2 minutes", datetime must be ~11:56 same day in that timezone.',
      '- NEVER copy the UTC clock time into datetime.',
      '- Do NOT include Z or an offset in datetime.',
      '',
      'Other rules:',
      '- reason: short description of what to remind (no time/date words).',
      '- timezone: IANA name such as Asia/Kolkata',
      '- Resolve relative phrases like "today", "tomorrow", "in 2 hours", "next Monday" using the LOCAL datetime above.',
      '- For calendar dates like "15th September", "December 31st", datetime MUST use that month/day (and current or next year if year omitted), NOT today\'s date.',
      '- Example: if today is 2026-08-06 and user says "on 15th September at 6:30 PM", datetime must be "2026-09-15T18:30:00".',
      '- Example: "next Monday at 9:00 AM" must be the upcoming Monday date, not today.',
      '- This path is for ONE-SHOT reminders only. Recurring ("every Sunday", "every minute for next 5 minutes", "15 min before 9AM") is handled elsewhere.',
      '- If date or time cannot be determined confidently, return {"error":"ambiguous"}.',
    ].join('\n');
  }

  private parseAiContent(content: string, referenceDate: Date): ParsedReminder | null {
    let json: unknown;

    try {
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      json = JSON.parse(cleaned);
    } catch {
      logger.warn('AI returned non-JSON content', { content });
      return null;
    }

    if (typeof json === 'object' && json !== null && 'error' in json) {
      return null;
    }

    const parsed = parsedReminderSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn('AI JSON failed schema validation', {
        issues: parsed.error.flatten(),
      });
      return null;
    }

    const timezone = parsed.data.timezone || this.defaultTimezone;

    let utcDate: Date;
    try {
      utcDate = resolveToUtcDate(parsed.data.datetime, timezone);
    } catch {
      logger.warn('AI returned invalid datetime', { datetime: parsed.data.datetime });
      return null;
    }

    if (Number.isNaN(utcDate.getTime())) {
      logger.warn('AI returned invalid datetime', { datetime: parsed.data.datetime });
      return null;
    }

    // Guard: if model accidentally returned a far-past UTC clock as "local", reject near-miss past
    // only when it's more than 30s in the past (allow tiny clock skew).
    if (utcDate.getTime() < referenceDate.getTime() - 30_000) {
      logger.warn('Parsed reminder datetime is in the past', {
        datetime: parsed.data.datetime,
        timezone,
        utc: utcDate.toISOString(),
      });
      throw new AppError('Time should be in future', 400, 'PAST_TIME');
    }

    return {
      reason: parsed.data.reason.trim(),
      // Store absolute UTC so scheduler/display stay consistent
      datetime: utcDate.toISOString(),
      timezone,
    };
  }

  isConfigured(): boolean {
    return Boolean(config.AI_API_URL && config.AI_API_KEY && config.AI_MODEL);
  }
}
