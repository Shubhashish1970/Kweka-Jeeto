import mongoose, { Document, Schema } from 'mongoose';

export interface ILandholding {
  value: number;
  unit: string;
  acres: number;
}

export interface IFarmer extends Document {
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
  /** Landholding captured during onboarding, standardised to acres */
  landholding?: ILandholding;
  /** Date from which to start sending daily crop advisory */
  advisory_start_date?: Date;
  /** Last time we sent the daily advisory (to avoid duplicate sends) */
  last_advisory_sent_at?: Date;
  flow_token?: string;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LandholdingSchema = new Schema<ILandholding>(
  {
    value: { type: Number, required: true },
    unit:  { type: String, required: true },
    acres: { type: Number, required: true },
  },
  { _id: false }
);

const FarmerSchema = new Schema<IFarmer>(
  {
    wa_id: { type: String, required: true, index: true },
    farmer_name: { type: String, required: true },
    age: { type: String, required: true },
    profession: { type: String, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true },
    crop: { type: String, required: true, index: true },
    landholding: { type: LandholdingSchema },
    advisory_start_date: { type: Date },
    last_advisory_sent_at: { type: Date },
    flow_token: { type: String },
    language: { type: String },
  },
  { timestamps: true }
);

export const Farmer = mongoose.model<IFarmer>('Farmer', FarmerSchema);
