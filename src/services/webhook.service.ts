import { handleFlowCompletion } from './flow-response.service';
import { sendFlowMessage, sendTextMessage } from './message.service';
import { logger } from '../utils/logger';

const FALLBACK_REPLY = 'Welcome to Kweka Jeeto! If you did not receive the registration form, please try again in a moment.';

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
          logger.info('Text message from', from, ':', message.text?.body);
          try {
            const sent = await sendFlowMessage(from);
            if (!sent) {
              logger.warn('Flow message not sent, sending fallback text to', from);
              await sendTextMessage(from, FALLBACK_REPLY);
            }
          } catch (err) {
            logger.error('Error sending flow message to', from, err);
            await sendTextMessage(from, FALLBACK_REPLY).catch((e) => logger.error('Fallback text also failed', e));
          }
        } else if (type === 'interactive' && message.interactive?.type === 'nfm_reply') {
          const responseJson = message.interactive.nfm_reply?.response_json;
          if (responseJson) {
            logger.info('Flow completion from', from);
            await handleFlowCompletion(from, responseJson);
          }
        }
      }
    }
  }
};
