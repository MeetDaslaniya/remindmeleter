import { Schema, model, models, type InferSchemaType, type Model, Types } from 'mongoose';

const voxellanceSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    allowed: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'Voxellance',
  }
);

export type VoxellanceDocument = InferSchemaType<typeof voxellanceSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const VoxellanceModel: Model<VoxellanceDocument> =
  (models.Voxellance as Model<VoxellanceDocument>) ||
  model<VoxellanceDocument>('Voxellance', voxellanceSchema, 'Voxellance');
