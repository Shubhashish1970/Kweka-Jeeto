import { getConfigValue } from './data.service';
import { getFarmersDueForDailyAdvisory, updateLastAdvisorySentAt } from '../data/repositories/farmer.repository';
import { sendTextMessage } from './message.service';
import { logger } from '../utils/logger';
import { IFarmer } from '../data/models/Farmer';

const DEFAULT_ADVISORY_MESSAGE = 'Your daily crop advisory: tips and updates for your crop. Stay tuned for more.';

function cropLabel(cropId: string): string {
  const labels: Record<string, string> = {
    cotton: 'Cotton',
    paddy: 'Paddy',
    chilli: 'Chilli',
    maize: 'Maize',
    tomato: 'Tomato',
  };
  return labels[cropId] ?? cropId;
}

/** Build message for a farmer (supports {{crop}} placeholder) */
async function buildAdvisoryMessage(farmer: IFarmer): Promise<string> {
  const template = await getConfigValue<string>('crop_advisory_message');
  const text = (template && template.trim()) || DEFAULT_ADVISORY_MESSAGE;
  const cropName = cropLabel(farmer.crop);
  return text.replace(/\{\{crop\}\}/gi, cropName);
}

/** Run daily advisory: send one message per due farmer and update last_advisory_sent_at */
export const runDailyAdvisory = async (): Promise<{ sent: number; failed: number }> => {
  const farmers = await getFarmersDueForDailyAdvisory();
  let sent = 0;
  let failed = 0;

  for (const farmer of farmers) {
    try {
      const message = await buildAdvisoryMessage(farmer);
      const ok = await sendTextMessage(farmer.wa_id, message);
      if (ok) {
        await updateLastAdvisorySentAt(String((farmer as IFarmer & { _id: unknown })._id));
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      logger.error('Daily advisory send failed for', farmer.wa_id, err);
      failed++;
    }
  }

  if (farmers.length > 0) {
    logger.info('Daily advisory run: sent=%d failed=%d total=%d', sent, failed, farmers.length);
  }
  return { sent, failed };
};
