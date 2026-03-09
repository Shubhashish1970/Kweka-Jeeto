import * as farmerRepo from '../data/repositories/farmer.repository';
import * as configRepo from '../data/repositories/config.repository';
import * as auditRepo from '../data/repositories/audit.repository';
import { IFarmer } from '../data/models/Farmer';

export interface CreateFarmerInput {
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
  flow_token?: string;
}

export const createFarmer = async (data: CreateFarmerInput): Promise<IFarmer> => {
  return farmerRepo.createFarmer(data);
};

export const getFarmers = farmerRepo.getFarmers;
export const getFarmersForExport = farmerRepo.getFarmersForExport;
export const getFarmerCount = farmerRepo.getFarmerCount;

export const getConfig = configRepo.getConfig;
export const getConfigValue = configRepo.getConfigValue;
export const getAllConfig = configRepo.getAllConfig;
export const setConfig = configRepo.setConfig;
export const setConfigBulk = configRepo.setConfigBulk;

export const logAudit = auditRepo.createAuditLog;
