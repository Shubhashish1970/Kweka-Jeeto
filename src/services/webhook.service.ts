import { handleFlowCompletion } from './flow-response.service';
import { sendFlowMessage } from './message.service';
import { logger } from '../utils/logger';

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

      for (const message of messages) {
        const from = message.from;
        const type = message.type;

        if (type === 'text') {
          logger.info('Text message from', from, ':', message.text?.body);
          await sendFlowMessage(from);
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
