import mongoose, { Document, Schema } from 'mongoose';

export interface ICropEntry {
  id: string;
  title: string;
  description: string;
}

export interface IStateCrop extends Document {
  state: string;
  stateLabel: string;
  crops: ICropEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const CropEntrySchema = new Schema<ICropEntry>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const StateCropSchema = new Schema<IStateCrop>(
  {
    state: { type: String, required: true, unique: true, index: true },
    stateLabel: { type: String, required: true },
    crops: { type: [CropEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const StateCrop = mongoose.model<IStateCrop>('StateCrop', StateCropSchema);
