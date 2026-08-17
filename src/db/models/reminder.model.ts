import { Schema, model, models, type InferSchemaType, type Model, Types } from 'mongoose';

import { ReminderStatus } from '../../types';

const recurrenceSchema = new Schema(
  {
    kind: { type: String, required: true, enum: ['interval', 'daily', 'weekly', 'monthly', 'yearly'] },
    intervalMs: { type: Number },
    weekdays: { type: [Number] },
    month: { type: Number },
    dayOfMonth: { type: Number },
    hour: { type: Number },
    minute: { type: Number },
    endsAt: { type: String },
    remainingCount: { type: Number },
    totalCount: { type: Number },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const reminderSchema = new Schema(
  {
    customerId: { type: Types.ObjectId, ref: 'Customer', index: true },
    telegramUserId: { type: String, required: true, index: true },
    chatId: { type: String, required: true, index: true },
    originalMessage: { type: String, required: true },
    reason: { type: String, required: true },
    datetime: { type: String, required: true, index: true },
    timezone: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'sent', 'snoozed', 'completed', 'cancelled', 'failed'],
      default: ReminderStatus.SCHEDULED,
      index: true,
    },
    completedAt: { type: String },
    sentAt: { type: String },
    snoozedAt: { type: String },
    snoozeCount: { type: Number, default: 0 },
    lastSnoozeDuration: { type: Number },
    telegramMessageId: { type: Number },
    channel: {
      type: String,
      required: true,
      default: 'telegram',
      enum: ['telegram', 'whatsapp', 'messenger', 'slack', 'discord'],
    },
    recurrence: { type: recurrenceSchema },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export type ReminderDocument = InferSchemaType<typeof reminderSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ReminderModel: Model<ReminderDocument> =
  (models.Reminder as Model<ReminderDocument>) || model<ReminderDocument>('Reminder', reminderSchema);
