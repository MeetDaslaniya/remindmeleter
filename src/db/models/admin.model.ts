import { Schema, model, models, type InferSchemaType, type Model, Types } from 'mongoose';



const adminSchema = new Schema(

  {

    email: {

      type: String,

      required: true,

      unique: true,

      lowercase: true,

      trim: true,

      index: true,

    },

    passwordHash: { type: String, required: true },

    name: { type: String, default: 'Admin' },

    role: { type: String, default: 'admin', enum: ['admin'] },

  },

  {

    timestamps: true,

    versionKey: false,

  }

);



export type AdminDocument = InferSchemaType<typeof adminSchema> & {

  _id: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;

};



export const AdminModel: Model<AdminDocument> =

  (models.Admin as Model<AdminDocument>) || model<AdminDocument>('Admin', adminSchema);


