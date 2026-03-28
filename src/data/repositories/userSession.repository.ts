import { UserSession } from '../models/UserSession';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function expiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

/** Store or refresh a language preference for a user. Resets the 24h TTL on each call. */
export const setSessionLanguage = async (waId: string, language: string): Promise<void> => {
  await UserSession.findOneAndUpdate(
    { wa_id: waId },
    { $set: { language, expires_at: expiresAt() } },
    { upsert: true }
  );
};

/** Returns the stored language for a user, or null if not set / expired. */
export const getSessionLanguage = async (waId: string): Promise<string | null> => {
  const session = await UserSession.findOne({ wa_id: waId }).lean();
  return (session as { language?: string } | null)?.language ?? null;
};
