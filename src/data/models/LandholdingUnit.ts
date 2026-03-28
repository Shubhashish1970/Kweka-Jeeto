import mongoose, { Document, Schema } from 'mongoose';

export interface ILandholdingUnit extends Document {
  id: string;                  // slug e.g. "acre", "hectare"
  label: string;               // display e.g. "Acre", "Hectare"
  conversion_factor: number;   // multiplier to convert this unit → acres
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const LandholdingUnitSchema = new Schema<ILandholdingUnit>(
  {
    id:                { type: String, required: true, unique: true, index: true },
    label:             { type: String, required: true },
    conversion_factor: { type: Number, required: true },
    active:            { type: Boolean, default: true },
    order:             { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LandholdingUnit = mongoose.model<ILandholdingUnit>('LandholdingUnit', LandholdingUnitSchema);
