import { Schema, model, models, type InferSchemaType, type Model, Types } from 'mongoose';



const customerSchema = new Schema(

  {

    telegramUserId: { type: String, required: true, unique: true, index: true },

    chatId: { type: String, required: true, index: true },

    username: { type: String },

    firstName: { type: String },

    lastName: { type: String },

    timezone: { type: String, required: true, default: 'Asia/Kolkata' },

    channel: {

      type: String,

      required: true,

      default: 'telegram',

      enum: ['telegram', 'whatsapp', 'messenger', 'slack', 'discord'],

    },

    reminderCount: { type: Number, required: true, default: 0 },

    messageCount: { type: Number, required: true, default: 0 },

    lastSeenAt: { type: Date, required: true, default: () => new Date() },

  },

  {

    timestamps: true,

    versionKey: false,

  }

);



export type CustomerDocument = InferSchemaType<typeof customerSchema> & {

  _id: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;

};



export const CustomerModel: Model<CustomerDocument> =

  (models.Customer as Model<CustomerDocument>) ||

  model<CustomerDocument>('Customer', customerSchema);


