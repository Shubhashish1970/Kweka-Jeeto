import mongoose, { Document, Schema } from 'mongoose';

export interface IConfig extends Document {
  key: string;
  value: unknown;
  updatedBy?: string;
  updatedAt: Date;
}

const ConfigSchema = new Schema<IConfig>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const Config = mongoose.model<IConfig>('Config', ConfigSchema);
