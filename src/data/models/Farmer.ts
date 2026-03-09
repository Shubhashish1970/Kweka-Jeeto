import mongoose, { Document, Schema } from 'mongoose';

export interface IFarmer extends Document {
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
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
    flow_token: { type: String },
  },
  { timestamps: true }
);

export const Farmer = mongoose.model<IFarmer>('Farmer', FarmerSchema);
