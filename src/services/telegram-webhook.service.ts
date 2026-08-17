import { MessagingProvider, IncomingMessage } from '../providers/messaging.provider';
import { TelegramProvider } from '../providers/telegram/telegram.provider';
import { AiService } from './ai.service';
import { ReminderService } from './reminder.service';
import { CustomerService } from './customer.service';
import { ReminderActionService } from './reminder-action.service';

import { logger } from '../utils/logger';

import { formatInTimeZone, resolveToUtcDate } from '../utils/datetime';

import { AppError } from '../utils/errors';

import {

  isGreeting,

  isThanks,

  looksLikeReminderIntent,

} from '../utils/message-intent';

import { Reminder } from '../types';

import { config } from '../config';



const PARSE_FAILURE_REPLY =

  "I couldn't understand the reminder time. Please try again.";

const PAST_TIME_REPLY = 'Time should be in future.';



const GREETING_REPLY = [

  '👋 <b>Hi!</b> I’m PingLater — your Telegram reminder bot (pinglater.in).',

  '',

  'Send a reminder in plain English, for example:',

  '• Remind me in 2 minutes to drink water',

  '• Remind me every Sunday at 6 AM to play cricket',

  '',

  'Manage reminders:',

  '• /list — see your active reminders',

  '• /cancel 1 — stop reminder #1',

  '• /cancel all — stop all reminders',

  '',

  'Type /help anytime for more examples.',

].join('\n');



const CASUAL_REPLY = [

  'I’m built for reminders 🙂',

  '',

  'Try something like:',

  '<b>Remind me in 10 minutes to stretch</b>',

  '',

  'Or manage reminders with /list and /cancel.',

].join('\n');



const THANKS_REPLY = 'You’re welcome! Send another reminder anytime.';



const HELP_TEXT = [

  '👋 <b>Natural Language Reminder Bot</b>',

  '',

  'One-time:',

  '• Remind me today at 8 PM to take medicine',

  '• Remind me in 2 hours to stretch',

  '',

  'Repeating:',

  '• Remind me every minute for the next 5 minutes to drink water',

  '• Remind me every Sunday at 6 AM to play cricket',

  '• Remind me 15 minutes before I go to office at 9:00 AM to pack my bag',

  '',

  'Manage yours:',

  '• When a reminder fires, tap ✅ Completed or 😴 Snooze',

  '• /list — show active reminders',

  '• /cancel 2 — cancel reminder number 2 from /list',

  '• /cancel all — cancel every active reminder',

  '• /stop — same as /cancel',

].join('\n');



export class TelegramWebhookService {

  constructor(
    private readonly messagingProvider: MessagingProvider,
    private readonly aiService: AiService,
    private readonly reminderService: ReminderService,
    private readonly customerService: CustomerService,
    private readonly telegramProvider: TelegramProvider,
    private readonly reminderActionService: ReminderActionService
  ) {}

  async handleUpdate(payload: unknown): Promise<void> {
    const callback = this.telegramProvider.parseCallbackQuery(payload);
    if (callback) {
      await this.reminderActionService.handleReminderCallback(callback);
      return;
    }

    const incoming = this.messagingProvider.parseIncomingPayload(payload);

    if (!incoming) {

      logger.debug('Ignoring non-text Telegram update');

      return;

    }



    const customer = await this.customerService.touchFromMessage({

      telegramUserId: incoming.userId,

      chatId: incoming.chatId,

      username: incoming.username,

      firstName: incoming.firstName,

      lastName: incoming.lastName,

      timezone: config.DEFAULT_TIMEZONE,

      channel: 'telegram',

    });



    if (this.isCommand(incoming.text) || this.isManagePhrase(incoming.text)) {

      await this.handleCommand(incoming);

      return;

    }



    if (isGreeting(incoming.text)) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: GREETING_REPLY,

        parseMode: 'HTML',

      });

      return;

    }



    if (isThanks(incoming.text)) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: THANKS_REPLY,

      });

      return;

    }



    if (!looksLikeReminderIntent(incoming.text)) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: CASUAL_REPLY,

        parseMode: 'HTML',

      });

      return;

    }



    await this.handleReminderRequest(incoming, customer.id);

  }



  private isCommand(text: string): boolean {

    return text.trim().startsWith('/');

  }



  private isManagePhrase(text: string): boolean {

    const normalized = text.trim().toLowerCase();

    return (

      /^(list|show|my)\b.*\breminders?\b/.test(normalized) ||

      /^(cancel|stop|kill)\b/.test(normalized)

    );

  }



  private parseCommand(text: string): { command: string; args: string } {

    const trimmed = text.trim();

    if (trimmed.startsWith('/')) {

      const [rawCmd, ...rest] = trimmed.split(/\s+/);

      const command = (rawCmd ?? '').split('@')[0]?.toLowerCase() ?? '';

      return { command, args: rest.join(' ').trim() };

    }



    const normalized = trimmed.toLowerCase();

    if (/^(list|show|my)\b.*\breminders?\b/.test(normalized)) {

      return { command: '/list', args: '' };

    }

    if (/^(cancel|stop|kill)\s+all\b/.test(normalized)) {

      return { command: '/cancel', args: 'all' };

    }

    const numbered = normalized.match(/^(cancel|stop|kill)\s+#?(\d+)\b/);

    if (numbered) {

      return { command: '/cancel', args: numbered[2] };

    }

    if (/^(cancel|stop|kill)\b/.test(normalized)) {

      return { command: '/cancel', args: '' };

    }



    return { command: '', args: '' };

  }



  private async handleCommand(incoming: IncomingMessage): Promise<void> {

    const { command, args } = this.parseCommand(incoming.text);



    if (command === '/start' || command === '/help') {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: HELP_TEXT,

        parseMode: 'HTML',

      });

      return;

    }



    if (command === '/list' || command === '/my') {

      await this.handleListCommand(incoming);

      return;

    }



    if (command === '/cancel' || command === '/stop' || command === '/kill') {

      await this.handleCancelCommand(incoming, args);

      return;

    }



    await this.messagingProvider.sendMessage({

      chatId: incoming.chatId,

      text: 'Unknown command. Send /help for usage.',

    });

  }



  private async handleListCommand(incoming: IncomingMessage): Promise<void> {

    const reminders = await this.reminderService.getScheduledForUser(incoming.userId);



    if (reminders.length === 0) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: 'You have no active reminders.\n\nCreate one, e.g. <b>Remind me in 10 minutes to stretch</b>',

        parseMode: 'HTML',

      });

      return;

    }



    const lines = [

      `📋 <b>Your active reminders (${reminders.length})</b>`,

      '',

      ...reminders.map((reminder, index) => this.formatReminderLine(reminder, index + 1)),

      '',

      'To stop one: <code>/cancel 1</code>',

      'To stop all: <code>/cancel all</code>',

    ];



    await this.messagingProvider.sendMessage({

      chatId: incoming.chatId,

      text: lines.join('\n'),

      parseMode: 'HTML',

    });

  }



  private async handleCancelCommand(incoming: IncomingMessage, args: string): Promise<void> {

    const reminders = await this.reminderService.getScheduledForUser(incoming.userId);



    if (reminders.length === 0) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: 'You have no active reminders to cancel.',

      });

      return;

    }



    const normalizedArgs = args.trim().toLowerCase();



    if (!normalizedArgs) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: [

          'Which reminder should I cancel?',

          '',

          ...reminders.map((reminder, index) => this.formatReminderLine(reminder, index + 1)),

          '',

          'Reply with <code>/cancel 1</code> or <code>/cancel all</code>',

        ].join('\n'),

        parseMode: 'HTML',

      });

      return;

    }



    if (normalizedArgs === 'all') {

      const count = await this.reminderService.cancelAllForUser(incoming.userId);

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: `🛑 Cancelled <b>${count}</b> reminder${count === 1 ? '' : 's'}.`,

        parseMode: 'HTML',

      });

      return;

    }



    const index = Number(normalizedArgs.replace(/^#/, ''));

    if (!Number.isInteger(index) || index < 1 || index > reminders.length) {

      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: `Invalid number. Use /list then /cancel 1–${reminders.length}, or /cancel all.`,

      });

      return;

    }



    const target = reminders[index - 1];

    await this.reminderService.cancelForUser(target.id, incoming.userId);



    await this.messagingProvider.sendMessage({

      chatId: incoming.chatId,

      text: [

        '🛑 <b>Reminder cancelled</b>',

        '',

        `<b>What:</b> ${target.reason}`,

        ...(target.recurrence ? [`<b>Was:</b> ${target.recurrence.summary}`] : []),

      ].join('\n'),

      parseMode: 'HTML',

    });

  }



  private formatReminderLine(reminder: Reminder, number: number): string {

    const when = formatInTimeZone(

      resolveToUtcDate(reminder.datetime, reminder.timezone),

      reminder.timezone

    );

    const repeat = reminder.recurrence ? `\n   🔁 ${reminder.recurrence.summary}` : '';

    return `<b>${number}.</b> ${reminder.reason}\n   🕒 ${when}${repeat}`;

  }



  private async handleReminderRequest(

    incoming: IncomingMessage,

    customerId: string

  ): Promise<void> {

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

        customerId,

        ...(parsed.recurrence ? { recurrence: parsed.recurrence } : {}),

      });



      const whenDate = resolveToUtcDate(reminder.datetime, reminder.timezone);

      const when = formatInTimeZone(whenDate, reminder.timezone);

      const isRecurring = Boolean(reminder.recurrence);



      await this.messagingProvider.sendMessage({

        chatId: incoming.chatId,

        text: [

          isRecurring ? '✅ <b>Repeating reminder scheduled</b>' : '✅ <b>Reminder scheduled</b>',

          '',

          `<b>What:</b> ${reminder.reason}`,

          `<b>Next:</b> ${when} (${reminder.timezone})`,

          ...(reminder.recurrence ? [`<b>Repeat:</b> ${reminder.recurrence.summary}`] : []),

          '',

          'Manage: /list · /cancel',

        ].join('\n'),

        parseMode: 'HTML',

      });

    } catch (error) {

      if (error instanceof AppError && error.code === 'PAST_TIME') {

        await this.messagingProvider.sendMessage({

          chatId: incoming.chatId,

          text: PAST_TIME_REPLY,

        });

        return;

      }



      logger.error('Failed to process Telegram reminder request', {

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


