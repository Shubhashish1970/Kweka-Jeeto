import mongoose, { Document, Schema } from 'mongoose';

export interface IOccupationMaster extends Document {
  id: string;      // slug, e.g. "farmer"
  label: string;   // display, e.g. "Farmer"
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const OccupationMasterSchema = new Schema<IOccupationMaster>(
  {
    id:     { type: String, required: true, unique: true, index: true },
    label:  { type: String, required: true },
    active: { type: Boolean, default: true },
    order:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const OccupationMaster = mongoose.model<IOccupationMaster>('OccupationMaster', OccupationMasterSchema);
