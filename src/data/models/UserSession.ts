import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  wa_id: string;
  language: string;
  /** MongoDB TTL index — document is auto-deleted when this date is reached. */
  expires_at: Date;
}

const UserSessionSchema = new Schema<IUserSession>({
  wa_id: { type: String, required: true, unique: true, index: true },
  language: { type: String, required: true },
  expires_at: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);
