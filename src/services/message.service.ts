import axios from 'axios';
import { env } from '../config/env';
import { getConfigValue } from './data.service';
import { logger } from '../utils/logger';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

const getPhoneNumberId = async (): Promise<string> => {
  const fromConfig = await getConfigValue<string>('whatsapp_phone_number_id');
  return fromConfig || env.whatsapp.phoneNumberId;
};

const getFlowId = async (): Promise<string> => {
  const fromConfig = await getConfigValue<string>('flow_id');
  return fromConfig || env.whatsapp.flowId;
};

const getFlowCta = async (): Promise<string> => {
  const fromConfig = await getConfigValue<string>('flow_cta');
  return fromConfig || 'Register';
};

const getFlowHeader = async (): Promise<string> => {
  const fromConfig = await getConfigValue<string>('flow_header');
  return fromConfig || 'कृषि सलाह / Agri Advisory';
};

const getFlowBody = async (): Promise<string> => {
  const fromConfig = await getConfigValue<string>('flow_body');
  return fromConfig || 'Register to get crop advisory.';
};

export const sendFlowMessage = async (to: string): Promise<boolean> => {
  try {
    const phoneNumberId = (await getPhoneNumberId())?.trim();
    const flowId = (await getFlowId())?.trim();
    const flowCta = await getFlowCta();
    const flowHeader = await getFlowHeader();
    const flowBody = await getFlowBody();

    if (!phoneNumberId) {
      logger.error('WHATSAPP_PHONE_NUMBER_ID not configured. Set it in env or Admin Config.');
      return false;
    }
    if (!flowId) {
      logger.error('FLOW_ID not configured. Run npm run deploy:flow and set FLOW_ID in env or Admin Config.');
      return false;
    }

    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''),
      type: 'interactive',
      interactive: {
        type: 'flow',
        header: { type: 'text', text: flowHeader },
        body: { text: flowBody },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_id: flowId,
            flow_cta: flowCta,
          },
        },
      },
    };

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('Flow message sent to', to);
    return true;
  } catch (err: unknown) {
    const ax = err && typeof err === 'object' && 'response' in err ? (err as { response?: { status?: number; data?: unknown } }) : null;
    const status = ax?.response?.status;
    const data = ax?.response?.data;
    logger.error('Failed to send flow message:', status ? `HTTP ${status}` : '', data ?? err);
    return false;
  }
};

export const sendTextMessage = async (to: string, text: string): Promise<boolean> => {
  try {
    const phoneNumberId = await getPhoneNumberId();
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: text },
    };

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('Text message sent to', to);
    return true;
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: unknown } }).response?.data
      : err;
    logger.error('Failed to send text message:', msg);
    return false;
  }
};
