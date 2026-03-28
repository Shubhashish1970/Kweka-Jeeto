import { handleFlowCompletion } from './flow-response.service';
import { sendFlowMessage, sendTextMessage, sendLanguageSelectionMessage } from './message.service';
import { getFarmerByWaId } from '../data/repositories/farmer.repository';
import { getSessionLanguage, setSessionLanguage } from '../data/repositories/userSession.repository';
import { updateFarmerLanguageByWaId } from '../data/repositories/farmer.repository';
import { LANGUAGE_CHOICE_MAP, LANGUAGE_CONFIRMED } from './language.service';
import { logger } from '../utils/logger';

const FALLBACK_REPLY = 'Welcome to Kweka Jeeto! If you did not receive the registration form, please try again in a moment.';

const FLOW_TRIGGER_WORDS = ['hi', 'hello', 'start', 'register'];

function isFlowTrigger(body: string): boolean {
  const lower = body.toLowerCase().trim();
  return FLOW_TRIGGER_WORDS.some(
    (w) => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w)
  );
}

/** Handle language selection from either a list_reply (lang_hi) or a text reply (1–5). */
async function handleLanguageChoice(from: string, langCode: string): Promise<void> {
  logger.info('Webhook: language selected lang=%s for', langCode, from);
  await setSessionLanguage(from, langCode);
  await updateFarmerLanguageByWaId(from, langCode).catch(() => {});

  const confirmMsg = LANGUAGE_CONFIRMED[langCode] ?? LANGUAGE_CONFIRMED.en;
  await sendTextMessage(from, confirmMsg);

  const sent = await sendFlowMessage(from);
  if (!sent) {
    logger.warn('Flow not sent after language selection, sending fallback to', from);
    await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
  }
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
    list_reply?: { id: string; title: string };
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

        // ── Interactive: list_reply (language selection from list message) ────
        if (type === 'interactive' && message.interactive?.type === 'list_reply') {
          const rowId = message.interactive.list_reply?.id ?? '';
          // Row IDs are prefixed "lang_" e.g. "lang_hi"
          if (rowId.startsWith('lang_')) {
            const langCode = rowId.replace('lang_', '');
            try {
              await handleLanguageChoice(from, langCode);
            } catch (err) {
              logger.error('Error handling list_reply language selection for', from, err);
              await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
            }
          } else {
            logger.info('Webhook: unrecognised list_reply id', rowId, 'from', from);
          }
          continue;
        }

        // ── Interactive: nfm_reply (flow completion) ──────────────────────────
        if (type === 'interactive' && message.interactive?.type === 'nfm_reply') {
          const responseJson = message.interactive.nfm_reply?.response_json;
          if (responseJson) {
            logger.info('Webhook: flow completion from', from, 'response_json=', responseJson);
            await handleFlowCompletion(from, responseJson);
          } else {
            logger.warn('Webhook: nfm_reply missing response_json', { from });
          }
          continue;
        }

        // ── Text messages ─────────────────────────────────────────────────────
        if (type === 'text') {
          const rawBody = (message.text?.body ?? '').trim();
          logger.info('Webhook: text from', from, 'body=', JSON.stringify(rawBody));

          // Text fallback for language selection (1–5), in case list message unsupported
          const langCodeFromText = LANGUAGE_CHOICE_MAP[rawBody];
          if (langCodeFromText) {
            try {
              await handleLanguageChoice(from, langCodeFromText);
            } catch (err) {
              logger.error('Error handling text language selection for', from, err);
              await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
            }
            continue;
          }

          // Flow trigger words (hi / hello / start / register)
          if (isFlowTrigger(rawBody)) {
            logger.info('Webhook: flow trigger from', from);
            try {
              const [farmer, sessionLang] = await Promise.all([
                getFarmerByWaId(from).catch(() => null),
                getSessionLanguage(from).catch(() => null),
              ]);
              const hasLanguage = !!(farmer?.language || sessionLang);

              if (hasLanguage) {
                const sent = await sendFlowMessage(from);
                if (!sent) {
                  logger.warn('Flow message not sent, sending fallback to', from);
                  await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
                }
              } else {
                // First interaction — send the polished list message
                await sendLanguageSelectionMessage(from);
              }
            } catch (err) {
              logger.error('Error processing flow trigger for', from, err);
              await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
            }
            continue;
          }

          logger.info('Webhook: text not a trigger or language reply, ignoring', from);

        } else {
          logger.info('Webhook: unhandled message type', { from, type });
        }
      }
    }
  }
};
