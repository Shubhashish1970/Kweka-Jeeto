/**
 * Multilingual support utilities for Kweka Jeeto.
 * Covers all user-facing WhatsApp Flow screen text (10 keys).
 * Chat invite keys (flow_cta/header/body) stay single-language — sent before language is known.
 */

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  mr: 'मराठी (Marathi)',
  te: 'తెలుగు (Telugu)',
  bn: 'বাংলা (Bengali)',
} as const;

export type Language = keyof typeof SUPPORTED_LANGUAGES;
export const DEFAULT_LANGUAGE: Language = 'en';

/** Returns lang if valid, otherwise 'en'. */
export function validateLanguage(s: string): Language {
  return (s as Language) in SUPPORTED_LANGUAGES ? (s as Language) : DEFAULT_LANGUAGE;
}

/**
 * Built-in fallback strings for all 5 languages × all 10 multilingual flow config keys.
 * Used when the DB config value is missing or doesn't have a translation for a given language.
 */
export const DEFAULT_STRINGS: Record<Language, Record<string, string>> = {
  en: {
    flow_welcome_title: 'Welcome to Kweka Jeeto! 🌾',
    flow_welcome_body:
      'Get personalized daily crop advisory on WhatsApp — powered by local farming expertise. Register in under a minute.',
    flow_welcome_button_label: 'Register Now',
    flow_returning_title: 'Welcome back, {name}! 🌾',
    flow_returning_body:
      "You're registered for {crop} advisory. You can update your details below.",
    flow_returning_button_label: 'Update Details',
    flow_crop_section_title: 'Popular crops in {state}',
    flow_success_heading: "You're All Set, {name}! 🌾",
    flow_success_body:
      "Daily *{crop}* advisory will arrive every morning starting {date}. You'll get tips on watering, fertilizers, pest control & market prices tailored to your farm.",
    flow_completion_message:
      "✅ Registration complete! Hello {name}, you'll receive daily *{crop}* advisory starting {date}. Check your WhatsApp every morning for personalized tips. Welcome to Kweka Jeeto! 🌾",
  },
  hi: {
    flow_welcome_title: 'Kweka Jeeto में आपका स्वागत है! 🌾',
    flow_welcome_body:
      'WhatsApp पर व्यक्तिगत दैनिक फसल सलाह पाएं — स्थानीय कृषि विशेषज्ञता द्वारा संचालित। एक मिनट से भी कम समय में पंजीकरण करें।',
    flow_welcome_button_label: 'अभी पंजीकरण करें',
    flow_returning_title: 'वापस आने पर स्वागत, {name}! 🌾',
    flow_returning_body:
      'आप {crop} सलाह के लिए पंजीकृत हैं। आप नीचे अपना विवरण अपडेट कर सकते हैं।',
    flow_returning_button_label: 'विवरण अपडेट करें',
    flow_crop_section_title: '{state} में लोकप्रिय फसलें',
    flow_success_heading: 'आप तैयार हैं, {name}! 🌾',
    flow_success_body:
      'दैनिक *{crop}* सलाह {date} से हर सुबह आएगी। आपको पानी, खाद, कीट नियंत्रण और बाज़ार भाव पर व्यक्तिगत सुझाव मिलेंगे।',
    flow_completion_message:
      '✅ पंजीकरण पूर्ण! नमस्ते {name}, आपको {date} से दैनिक *{crop}* सलाह मिलेगी। व्यक्तिगत सुझावों के लिए हर सुबह अपना WhatsApp देखें। Kweka Jeeto में आपका स्वागत है! 🌾',
  },
  mr: {
    flow_welcome_title: 'Kweka Jeeto मध्ये आपले स्वागत आहे! 🌾',
    flow_welcome_body:
      'WhatsApp वर वैयक्तिक दैनंदिन पीक सल्ला मिळवा — स्थानिक शेती तज्ञतेद्वारे. एक मिनिटापेक्षा कमी वेळात नोंदणी करा.',
    flow_welcome_button_label: 'आता नोंदणी करा',
    flow_returning_title: 'परत आल्याबद्दल स्वागत, {name}! 🌾',
    flow_returning_body:
      'तुम्ही {crop} सल्ल्यासाठी नोंदणीकृत आहात. तुम्ही खाली तुमचे तपशील अपडेट करू शकता.',
    flow_returning_button_label: 'तपशील अपडेट करा',
    flow_crop_section_title: '{state} मधील लोकप्रिय पिके',
    flow_success_heading: 'तुम्ही तयार आहात, {name}! 🌾',
    flow_success_body:
      'दैनंदिन *{crop}* सल्ला {date} पासून दररोज सकाळी येईल. तुम्हाला पाणी, खते, कीड नियंत्रण आणि बाजारभाव यावर वैयक्तिक टिप्स मिळतील.',
    flow_completion_message:
      '✅ नोंदणी पूर्ण! नमस्कार {name}, तुम्हाला {date} पासून दैनंदिन *{crop}* सल्ला मिळेल. वैयक्तिक टिप्ससाठी दररोज सकाळी WhatsApp तपासा. Kweka Jeeto मध्ये स्वागत आहे! 🌾',
  },
  te: {
    flow_welcome_title: 'Kweka Jeeto కి స్వాగతం! 🌾',
    flow_welcome_body:
      'WhatsApp లో వ్యక్తిగత రోజువారీ పంట సలహా పొందండి — స్థానిక వ్యవసాయ నిపుణత ద్వారా. ఒక నిమిషం కంటే తక్కువ సమయంలో నమోదు చేసుకోండి.',
    flow_welcome_button_label: 'ఇప్పుడు నమోదు చేయండి',
    flow_returning_title: 'తిరిగి స్వాగతం, {name}! 🌾',
    flow_returning_body:
      'మీరు {crop} సలహా కోసం నమోదు చేసుకున్నారు. మీరు క్రింద మీ వివరాలను అప్‌డేట్ చేయవచ్చు.',
    flow_returning_button_label: 'వివరాలు అప్‌డేట్ చేయండి',
    flow_crop_section_title: '{state} లో ప్రముఖ పంటలు',
    flow_success_heading: 'మీరు సిద్ధంగా ఉన్నారు, {name}! 🌾',
    flow_success_body:
      'రోజువారీ *{crop}* సలహా {date} నుండి ప్రతి ఉదయం వస్తుంది. నీటి, ఎరువులు, చీడపీడల నియంత్రణ మరియు మార్కెట్ ధరలపై వ్యక్తిగత చిట్కాలు మీకు అందుతాయి.',
    flow_completion_message:
      '✅ నమోదు పూర్తైంది! నమస్కారం {name}, మీకు {date} నుండి రోజువారీ *{crop}* సలహా వస్తుంది. వ్యక్తిగత చిట్కాల కోసం ప్రతి ఉదయం WhatsApp చెక్ చేయండి. Kweka Jeeto కి స్వాగతం! 🌾',
  },
  bn: {
    flow_welcome_title: 'Kweka Jeeto তে আপনাকে স্বাগতম! 🌾',
    flow_welcome_body:
      'WhatsApp এ ব্যক্তিগত দৈনিক ফসল পরামর্শ পান — স্থানীয় কৃষি বিশেষজ্ঞতা দ্বারা পরিচালিত। এক মিনিটের কম সময়ে নিবন্ধন করুন।',
    flow_welcome_button_label: 'এখনই নিবন্ধন করুন',
    flow_returning_title: 'ফিরে আসার স্বাগতম, {name}! 🌾',
    flow_returning_body:
      'আপনি {crop} পরামর্শের জন্য নিবন্ধিত আছেন। আপনি নীচে আপনার বিবরণ আপডেট করতে পারেন।',
    flow_returning_button_label: 'বিবরণ আপডেট করুন',
    flow_crop_section_title: '{state} এ জনপ্রিয় ফসল',
    flow_success_heading: 'আপনি প্রস্তুত, {name}! 🌾',
    flow_success_body:
      'দৈনিক *{crop}* পরামর্শ {date} থেকে প্রতি সকালে আসবে। আপনি জল দেওয়া, সার, কীটপতঙ্গ নিয়ন্ত্রণ ও বাজার মূল্যে ব্যক্তিগত পরামর্শ পাবেন।',
    flow_completion_message:
      '✅ নিবন্ধন সম্পূর্ণ! নমস্কার {name}, আপনি {date} থেকে দৈনিক *{crop}* পরামর্শ পাবেন। ব্যক্তিগত পরামর্শের জন্য প্রতি সকালে WhatsApp চেক করুন। Kweka Jeeto তে স্বাগতম! 🌾',
  },
};

/**
 * Resolves a config value to a localized string.
 *
 * Resolution order:
 * 1. If `configValue` is an object with a `lang` key → use that translation.
 * 2. If `configValue` is a plain string (legacy) → use it for `en`; for other languages fall through.
 * 3. Fall back to `DEFAULT_STRINGS[lang][key]`.
 * 4. Ultimate fallback: `DEFAULT_STRINGS.en[key]` or empty string.
 *
 * Always returns a non-empty string (guaranteed by DEFAULT_STRINGS coverage).
 */
export function getLocalizedString(
  configValue: unknown,
  lang: Language,
  key: string
): string {
  if (configValue !== null && typeof configValue === 'object' && !Array.isArray(configValue)) {
    const map = configValue as Record<string, unknown>;
    const translated = map[lang];
    if (typeof translated === 'string' && translated.trim() !== '') return translated;
    // Locale map exists but no translation for this lang — fall through to defaults
  } else if (typeof configValue === 'string' && configValue.trim() !== '') {
    // Legacy plain-string value — treat as English
    if (lang === 'en') return configValue;
    // For other languages, use the built-in default for that language
  }

  return DEFAULT_STRINGS[lang]?.[key] ?? DEFAULT_STRINGS.en[key] ?? '';
}
