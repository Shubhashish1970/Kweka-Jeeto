import mongoose, { Document, Schema } from 'mongoose';

export interface IStateMaster extends Document {
  state: string;       // slug, e.g. "andhra_pradesh"
  stateLabel: string;  // display, e.g. "Andhra Pradesh"
  districts: string[]; // sorted list of district names
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StateMasterSchema = new Schema<IStateMaster>(
  {
    state:      { type: String, required: true, unique: true, index: true },
    stateLabel: { type: String, required: true },
    districts:  { type: [String], default: [] },
    active:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const StateMaster = mongoose.model<IStateMaster>('StateMaster', StateMasterSchema);
