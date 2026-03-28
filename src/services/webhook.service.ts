import { handleFlowCompletion } from './flow-response.service';
import { sendFlowMessage, sendTextMessage } from './message.service';
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

          // Flow trigger words (hi / hello / start / register) — send flow for all users.
          // Language selection is handled inside the flow as the first screen for new users.
          if (isFlowTrigger(rawBody)) {
            logger.info('Webhook: flow trigger from', from);
            try {
              const sent = await sendFlowMessage(from);
              if (!sent) {
                logger.warn('Flow message not sent, sending fallback to', from);
                await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
              }
            } catch (err) {
              logger.error('Error processing flow trigger for', from, err);
              await sendTextMessage(from, FALLBACK_REPLY).catch(() => {});
            }
            continue;
          }

          logger.info('Webhook: text not a trigger, ignoring', from);

        } else {
          logger.info('Webhook: unhandled message type', { from, type });
        }
      }
    }
  }
};
