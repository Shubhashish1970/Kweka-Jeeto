import { handleFlowCompletion } from './flow-response.service';
import { sendFlowMessage, sendTextMessage } from './message.service';
import { getFarmerByWaId } from '../data/repositories/farmer.repository';
import { getSessionLanguage, setSessionLanguage } from '../data/repositories/userSession.repository';
import { updateFarmerLanguageByWaId } from '../data/repositories/farmer.repository';
import {
  LANGUAGE_SELECTION_MESSAGE,
  LANGUAGE_CHOICE_MAP,
  LANGUAGE_CONFIRMED,
} from './language.service';
import { logger } from '../utils/logger';

const FALLBACK_REPLY = 'Welcome to Kweka Jeeto! If you did not receive the registration form, please try again in a moment.';

const FLOW_TRIGGER_WORDS = ['hi', 'hello', 'start', 'register'];

function isFlowTrigger(body: string): boolean {
  const lower = body.toLowerCase().trim();
  return FLOW_TRIGGER_WORDS.some(
    (w) => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w)
  );
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    nfm_reply?: { response_json: string };
  };
}

interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: WebhookMessage[];
    };
    field: string;
  }>;
}

export const processWebhookPayload = async (body: {
  object?: string;
  entry?: WebhookEntry[];
}): Promise<void> => {
  if (body.object !== 'whatsapp_business_account') return;

  const entries = body.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const messages = value.messages || [];
      if (messages.length > 0) {
        logger.info('Webhook: received', messages.length, 'message(s), phone_number_id:', value.metadata?.phone_number_id);
      }

      for (const message of messages) {
        const from = message.from;
        const type = message.type;

        if (type === 'text') {
          const rawBody = (message.text?.body ?? '').trim();
          logger.info('Webhook: text from', from, 'body=', JSON.stringify(rawBody));

          // ── Language selection reply (1–5) ──────────────────────────────────
          const langCode = LANGUAGE_CHOICE_MAP[rawBody];
          if (langCode) {
            logger.info('Webhook: language selected lang=%s for', langCode, from);
            try {
              // Persist in session (covers unregistered users) + farmer (if already registered)
              await setSessionLanguage(from, langCode);
              await updateFarmerLanguageByWaId(from, langCode).catch(() => {});

              const confirmMsg = LANGUAGE_CONFIRMED[langCode] ?? LANGUAGE_CONFIRMED.en;
              await sendTextMessage(from, confirmMsg);

              const sent = await sendFlowMessage(from);
              if (!sent) {
                logger.warn('Flow not sent after language selection, sending fallback to', from);
                await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
              }
            } catch (err) {
              logger.error('Error handling language selection for', from, err);
              await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
            }
            continue;
          }

          // ── Flow trigger words (hi / hello / start / register) ──────────────
          if (isFlowTrigger(rawBody)) {
            logger.info('Webhook: flow trigger from', from);
            try {
              // Check if language is already known (registered farmer or active session)
              const [farmer, sessionLang] = await Promise.all([
                getFarmerByWaId(from).catch(() => null),
                getSessionLanguage(from).catch(() => null),
              ]);
              const hasLanguage = !!(farmer?.language || sessionLang);

              if (hasLanguage) {
                // Language already set — send flow directly
                const sent = await sendFlowMessage(from);
                if (!sent) {
                  logger.warn('Flow message not sent, sending fallback to', from);
                  await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
                }
              } else {
                // No language on record — prompt selection first
                await sendTextMessage(from, LANGUAGE_SELECTION_MESSAGE);
              }
            } catch (err) {
              logger.error('Error processing flow trigger for', from, err);
              await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
            }
            continue;
          }

          logger.info('Webhook: text not a trigger or language reply, ignoring', from);

        } else if (type === 'interactive' && message.interactive?.type === 'nfm_reply') {
          const responseJson = message.interactive.nfm_reply?.response_json;
          if (responseJson) {
            logger.info('Webhook: flow completion from', from, 'response_json=', responseJson);
            await handleFlowCompletion(from, responseJson);
          } else {
            logger.warn('Webhook: interactive nfm_reply missing response_json', { from, type: message.interactive?.type });
          }
        } else {
          logger.info('Webhook: unhandled message type', { from, type });
        }
      }
    }
  }
};
