import { createFarmer, getConfigValue } from './data.service';
import { sendTextMessage } from './message.service';
import { parseFlowResponseJson, extractFarmerData } from '../flows/flow-handler';
import { logger } from '../utils/logger';

const DEFAULT_CONFIRMATION = 'Thank you. Your crop information has been recorded.';

export const handleFlowCompletion = async (
  waId: string,
  responseJson: string
): Promise<void> => {
  const payload = parseFlowResponseJson(responseJson);
  if (!payload) {
    logger.error('Invalid flow response_json');
    await sendTextMessage(waId, 'Sorry, we could not process your submission. Please try again.');
    return;
  }
  logger.info('Flow submission payload', { waId, payload });

  const farmerData = extractFarmerData(payload);

  try {
    await createFarmer({
      wa_id: waId,
      farmer_name: farmerData.farmer_name,
      age: farmerData.age,
      profession: farmerData.profession,
      state: farmerData.state,
      district: farmerData.district,
      crop: farmerData.crop,
      advisory_start_date: farmerData.advisory_start_date,
      flow_token: farmerData.flow_token,
    });
  } catch (err) {
    logger.error('Failed to save farmer:', err);
    await sendTextMessage(waId, 'Sorry, we encountered an error. Please try again later.');
    return;
  }
  logger.info('Farmer saved from flow', { waId, farmer_name: farmerData.farmer_name, crop: farmerData.crop });

  const confirmationMessage = await getConfigValue<string>('flow_completion_message');
  const message = confirmationMessage || DEFAULT_CONFIRMATION;

  await sendTextMessage(waId, message);
  logger.info('Flow completion: confirmation sent to', waId);
};
