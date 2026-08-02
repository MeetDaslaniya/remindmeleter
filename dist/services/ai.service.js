"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const datetime_1 = require("../utils/datetime");
const recurrence_1 = require("../utils/recurrence");
const parsedReminderSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1),
    datetime: zod_1.z.string().min(1),
    timezone: zod_1.z.string().min(1),
});
class AiService {
    client;
    model;
    defaultTimezone;
    constructor(apiUrl = config_1.config.AI_API_URL, apiKey = config_1.config.AI_API_KEY, model = config_1.config.AI_MODEL, defaultTimezone = config_1.config.DEFAULT_TIMEZONE) {
        this.client = axios_1.default.create({
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
    async parseReminder(message, referenceDate = new Date()) {
        const recurring = (0, recurrence_1.tryParseRecurringReminder)(message, this.defaultTimezone, referenceDate);
        if (recurring) {
            logger_1.logger.info('Parsed recurring reminder without AI', {
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
        const relative = (0, datetime_1.tryParseRelativeReminder)(message, this.defaultTimezone, referenceDate);
        if (relative) {
            logger_1.logger.info('Parsed relative reminder without AI', relative);
            return {
                reason: relative.reason,
                datetime: relative.datetimeUtc,
                timezone: relative.timezone,
            };
        }
        const explicitClock = (0, datetime_1.tryParseExplicitClockReminder)(message, this.defaultTimezone, referenceDate);
        if (explicitClock) {
            logger_1.logger.info('Parsed explicit clock reminder without AI', explicitClock);
            return {
                reason: explicitClock.reason,
                datetime: explicitClock.datetimeUtc,
                timezone: explicitClock.timezone,
            };
        }
        const systemPrompt = this.buildSystemPrompt(referenceDate);
        try {
            const { data } = await this.client.post('/chat/completions', {
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
                logger_1.logger.warn('AI returned empty content');
                return null;
            }
            return this.parseAiContent(content, referenceDate);
        }
        catch (error) {
            if (error instanceof errors_1.AppError) {
                throw error;
            }
            logger_1.logger.error('AI parse failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new errors_1.AppError('AI service unavailable', 502, 'AI_SERVICE_ERROR');
        }
    }
    buildSystemPrompt(referenceDate) {
        const localNow = (0, datetime_1.formatLocalIsoInTimeZone)(referenceDate, this.defaultTimezone);
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
            '- reason: short description of what to remind (no time words).',
            '- timezone: IANA name such as Asia/Kolkata',
            '- Resolve relative phrases like "today", "tomorrow", "in 2 hours", "next Monday" using the LOCAL datetime above.',
            '- This path is for ONE-SHOT reminders only. Recurring ("every Sunday", "every minute for next 5 minutes", "15 min before 9AM") is handled elsewhere.',
            '- If date or time cannot be determined confidently, return {"error":"ambiguous"}.',
        ].join('\n');
    }
    parseAiContent(content, referenceDate) {
        let json;
        try {
            const cleaned = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
            json = JSON.parse(cleaned);
        }
        catch {
            logger_1.logger.warn('AI returned non-JSON content', { content });
            return null;
        }
        if (typeof json === 'object' && json !== null && 'error' in json) {
            return null;
        }
        const parsed = parsedReminderSchema.safeParse(json);
        if (!parsed.success) {
            logger_1.logger.warn('AI JSON failed schema validation', {
                issues: parsed.error.flatten(),
            });
            return null;
        }
        const timezone = parsed.data.timezone || this.defaultTimezone;
        let utcDate;
        try {
            utcDate = (0, datetime_1.resolveToUtcDate)(parsed.data.datetime, timezone);
        }
        catch {
            logger_1.logger.warn('AI returned invalid datetime', { datetime: parsed.data.datetime });
            return null;
        }
        if (Number.isNaN(utcDate.getTime())) {
            logger_1.logger.warn('AI returned invalid datetime', { datetime: parsed.data.datetime });
            return null;
        }
        // Guard: if model accidentally returned a far-past UTC clock as "local", reject near-miss past
        // only when it's more than 30s in the past (allow tiny clock skew).
        if (utcDate.getTime() < referenceDate.getTime() - 30_000) {
            logger_1.logger.warn('Parsed reminder datetime is in the past', {
                datetime: parsed.data.datetime,
                timezone,
                utc: utcDate.toISOString(),
            });
            throw new errors_1.AppError('Time should be in future', 400, 'PAST_TIME');
        }
        return {
            reason: parsed.data.reason.trim(),
            // Store absolute UTC so scheduler/display stay consistent
            datetime: utcDate.toISOString(),
            timezone,
        };
    }
    isConfigured() {
        return Boolean(config_1.config.AI_API_URL && config_1.config.AI_API_KEY && config_1.config.AI_MODEL);
    }
}
exports.AiService = AiService;
//# sourceMappingURL=ai.service.js.map