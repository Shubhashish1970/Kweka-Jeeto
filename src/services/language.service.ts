/**
 * Language Service — Google Cloud Translation API with in-memory caching.
 * All backend data remains in English; translation is applied only at output time.
 */
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// In-memory translation cache: key = `${text}::${lang}`
const translationCache = new Map<string, string>();

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  mr: 'मराठी (Marathi)',
  te: 'తెలుగు (Telugu)',
  bn: 'বাংলা (Bengali)',
};

export const LANGUAGE_SELECTION_MESSAGE =
  'Welcome to Kweka Jeeto! 🌾\n\nPlease select your preferred language / अपनी भाषा चुनें:\n\n' +
  '1️⃣ English\n' +
  '2️⃣ हिन्दी (Hindi)\n' +
  '3️⃣ मराठी (Marathi)\n' +
  '4️⃣ తెలుగు (Telugu)\n' +
  '5️⃣ বাংলা (Bengali)';

/** Maps user reply ("1"–"5") to a language code. */
export const LANGUAGE_CHOICE_MAP: Record<string, string> = {
  '1': 'en',
  '2': 'hi',
  '3': 'mr',
  '4': 'te',
  '5': 'bn',
};

/** Confirmation messages after language is selected (pre-translated to avoid API call at selection time). */
export const LANGUAGE_CONFIRMED: Record<string, string> = {
  en: 'Language set to English. Please fill in the registration form below.',
  hi: 'भाषा हिन्दी पर सेट की गई। कृपया नीचे पंजीकरण फ़ॉर्म भरें।',
  mr: 'भाषा मराठी वर सेट केली. कृपया खाली नोंदणी फॉर्म भरा.',
  te: 'భాష తెలుగుకు సెట్ చేయబడింది. దయచేసి క్రింద నమోదు ఫారమ్ పూరించండి.',
  bn: 'ভাষা বাংলায় সেট করা হয়েছে। অনুগ্রহ করে নিচের নিবন্ধন ফর্মটি পূরণ করুন।',
};

// Skip translation for pure numbers or unit measurements
const SKIP_TRANSLATION_RE = /^\d+(\.\d+)?(\s*(kg|g|mg|ml|L|litre|liter|acre|ac|ha|bigha|gunta|cent))?$/i;

/**
 * Translates English `text` to `targetLang` via Google Cloud Translation API.
 *
 * - Returns original text immediately if targetLang === 'en' or API key is missing.
 * - Results are cached in-memory for the process lifetime (per Cloud Run instance).
 * - Degrades gracefully: returns original text on any API error.
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !targetLang || targetLang === 'en') return text;
  if (SKIP_TRANSLATION_RE.test(text.trim())) return text;

  const cacheKey = `${text}::${targetLang}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const apiKey = env.googleTranslateApiKey;
  if (!apiKey) {
    logger.warn('GOOGLE_TRANSLATE_API_KEY not configured — skipping translation');
    return text;
  }

  try {
    const resp = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      { q: text, source: 'en', target: targetLang, format: 'text' }
    );
    const translated: string =
      (resp.data as { data?: { translations?: Array<{ translatedText?: string }> } })
        ?.data?.translations?.[0]?.translatedText ?? text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    logger.error('Translation failed (lang=%s):', targetLang, err);
    return text;
  }
}
