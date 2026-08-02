"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramWebhookService = void 0;
const logger_1 = require("../utils/logger");
const datetime_1 = require("../utils/datetime");
const errors_1 = require("../utils/errors");
const message_intent_1 = require("../utils/message-intent");
const PARSE_FAILURE_REPLY = "I couldn't understand the reminder time. Please try again.";
const PAST_TIME_REPLY = 'Time should be in future.';
const GREETING_REPLY = [
    '👋 <b>Hi!</b> I’m RemindAI — your Telegram reminder bot.',
    '',
    'Send a reminder in plain English, for example:',
    '• Remind me in 2 minutes to drink water',
    '• Remind me today at 8 PM to take medicine',
    '• Remind me every Sunday at 6 AM to play cricket',
    '• Remind me every minute for the next 5 minutes to stretch',
    '',
    'Type /help anytime for more examples.',
].join('\n');
const CASUAL_REPLY = [
    'I’m built for reminders 🙂',
    '',
    'Try something like:',
    '<b>Remind me in 10 minutes to stretch</b>',
    '<b>Remind me every Sunday at 6 AM to play cricket</b>',
    '',
    'Or send /help for examples.',
].join('\n');
const THANKS_REPLY = 'You’re welcome! Send another reminder anytime.';
const HELP_TEXT = [
    '👋 <b>Natural Language Reminder Bot</b>',
    '',
    'One-time:',
    '• Remind me today at 8 PM to take medicine',
    '• Remind me tomorrow at 5pm to call John',
    '• Remind me in 2 hours to stretch',
    '',
    'Repeating:',
    '• Remind me every minute for the next 5 minutes to drink water',
    '• Remind me every Sunday at 6 AM to play cricket',
    '• Remind me 15 minutes before I go to office at 9:00 AM to pack my bag',
].join('\n');
class TelegramWebhookService {
    messagingProvider;
    aiService;
    reminderService;
    constructor(messagingProvider, aiService, reminderService) {
        this.messagingProvider = messagingProvider;
        this.aiService = aiService;
        this.reminderService = reminderService;
    }
    async handleUpdate(payload) {
        const incoming = this.messagingProvider.parseIncomingPayload(payload);
        if (!incoming) {
            logger_1.logger.debug('Ignoring non-text Telegram update');
            return;
        }
        if (this.isCommand(incoming.text)) {
            await this.handleCommand(incoming);
            return;
        }
        if ((0, message_intent_1.isGreeting)(incoming.text)) {
            await this.messagingProvider.sendMessage({
                chatId: incoming.chatId,
                text: GREETING_REPLY,
                parseMode: 'HTML',
            });
            return;
        }
        if ((0, message_intent_1.isThanks)(incoming.text)) {
            await this.messagingProvider.sendMessage({
                chatId: incoming.chatId,
                text: THANKS_REPLY,
            });
            return;
        }
        if (!(0, message_intent_1.looksLikeReminderIntent)(incoming.text)) {
            await this.messagingProvider.sendMessage({
                chatId: incoming.chatId,
                text: CASUAL_REPLY,
                parseMode: 'HTML',
            });
            return;
        }
        await this.handleReminderRequest(incoming);
    }
    isCommand(text) {
        return text.startsWith('/');
    }
    async handleCommand(incoming) {
        const command = incoming.text.split(/\s+/)[0]?.toLowerCase() ?? '';
        if (command === '/start' || command === '/help') {
            await this.messagingProvider.sendMessage({
                chatId: incoming.chatId,
                text: HELP_TEXT,
                parseMode: 'HTML',
            });
            return;
        }
        await this.messagingProvider.sendMessage({
            chatId: incoming.chatId,
            text: 'Unknown command. Send /help for usage.',
        });
    }
    async handleReminderRequest(incoming) {
        try {
            const parsed = await this.aiService.parseReminder(incoming.text);
            if (!parsed) {
                await this.messagingProvider.sendMessage({
                    chatId: incoming.chatId,
                    text: PARSE_FAILURE_REPLY,
                });
                return;
            }
            const reminder = await this.reminderService.createReminder({
                telegramUserId: incoming.userId,
                chatId: incoming.chatId,
                originalMessage: incoming.text,
                reason: parsed.reason,
                datetime: parsed.datetime,
                timezone: parsed.timezone,
                channel: 'telegram',
                ...(parsed.recurrence ? { recurrence: parsed.recurrence } : {}),
            });
            const whenDate = (0, datetime_1.resolveToUtcDate)(reminder.datetime, reminder.timezone);
            const when = (0, datetime_1.formatInTimeZone)(whenDate, reminder.timezone);
            const isRecurring = Boolean(reminder.recurrence);
            await this.messagingProvider.sendMessage({
                chatId: incoming.chatId,
                text: [
                    isRecurring ? '✅ <b>Repeating reminder scheduled</b>' : '✅ <b>Reminder scheduled</b>',
                    '',
                    `<b>What:</b> ${reminder.reason}`,
                    `<b>Next:</b> ${when} (${reminder.timezone})`,
                    ...(reminder.recurrence ? [`<b>Repeat:</b> ${reminder.recurrence.summary}`] : []),
                ].join('\n'),
                parseMode: 'HTML',
            });
        }
        catch (error) {
            if (error instanceof errors_1.AppError && error.code === 'PAST_TIME') {
                await this.messagingProvider.sendMessage({
                    chatId: incoming.chatId,
                    text: PAST_TIME_REPLY,
                });
                return;
            }
            logger_1.logger.error('Failed to process Telegram reminder request', {
                error: error instanceof Error ? error.message : String(error),
                chatId: incoming.chatId,
            });
            await this.messagingProvider.sendMessage({
                chatId: incoming.chatId,
                text: 'Something went wrong while creating your reminder. Please try again later.',
            });
        }
    }
}
exports.TelegramWebhookService = TelegramWebhookService;
//# sourceMappingURL=telegram-webhook.service.js.map