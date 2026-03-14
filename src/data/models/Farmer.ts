import mongoose, { Document, Schema } from 'mongoose';

export interface IFarmer extends Document {
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
  /** Date from which to start sending daily crop advisory */
  advisory_start_date?: Date;
  /** Last time we sent the daily advisory (to avoid duplicate sends) */
  last_advisory_sent_at?: Date;
  flow_token?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FarmerSchema = new Schema<IFarmer>(
  {
    wa_id: { type: String, required: true, index: true },
    farmer_name: { type: String, required: true },
    age: { type: String, required: true },
    profession: { type: String, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true },
    crop: { type: String, required: true, index: true },
    advisory_start_date: { type: Date },
    last_advisory_sent_at: { type: Date },
    flow_token: { type: String },
  },
  { timestamps: true }
);

export const Farmer = mongoose.model<IFarmer>('Farmer', FarmerSchema);
