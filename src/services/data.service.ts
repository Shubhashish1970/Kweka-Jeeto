import * as farmerRepo from '../data/repositories/farmer.repository';
import * as stateMasterRepo from '../data/repositories/stateMaster.repository';
import * as occupationRepo from '../data/repositories/occupationMaster.repository';
import * as landholdingUnitRepo from '../data/repositories/landholdingUnit.repository';
import * as configRepo from '../data/repositories/config.repository';
import * as auditRepo from '../data/repositories/audit.repository';
import * as stateCropRepo from '../data/repositories/stateCrop.repository';
import { IFarmer } from '../data/models/Farmer';

export interface CreateFarmerInput {
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
  advisory_start_date?: Date;
  flow_token?: string;
}

export const createFarmer = async (data: CreateFarmerInput): Promise<IFarmer> => {
  return farmerRepo.createFarmer(data);
};

export const upsertFarmer = async (data: CreateFarmerInput): Promise<IFarmer> => {
  return farmerRepo.upsertFarmer(data);
};

export const getFarmers = farmerRepo.getFarmers;
export const getFarmersForExport = farmerRepo.getFarmersForExport;
export const getFarmerCount = farmerRepo.getFarmerCount;
export const updateFarmer = farmerRepo.updateFarmerById;
export const deleteFarmer = farmerRepo.deleteFarmerById;

export const getConfig = configRepo.getConfig;
export const getConfigValue = configRepo.getConfigValue;
export const getAllConfig = configRepo.getAllConfig;
export const setConfig = configRepo.setConfig;
export const setConfigBulk = configRepo.setConfigBulk;

export const logAudit = auditRepo.createAuditLog;

export const getAllStateCrops = stateCropRepo.getAllStateCrops;
export const getStateCrop = stateCropRepo.getStateCrop;
export const upsertStateCrop = stateCropRepo.upsertStateCrop;
export const addCropToState = stateCropRepo.addCropToState;
export const updateCropInState = stateCropRepo.updateCropInState;
export const deleteCropFromState = stateCropRepo.deleteCropFromState;
export const seedStateCrops = stateCropRepo.seedStateCrops;

export const getAllStateMasters = stateMasterRepo.getAllStateMasters;
export const getStateMaster = stateMasterRepo.getStateMaster;
export const getDistrictsByState = stateMasterRepo.getDistrictsByState;
export const createStateMaster = stateMasterRepo.createStateMaster;
export const updateStateMaster = stateMasterRepo.updateStateMaster;
export const deleteStateMaster = stateMasterRepo.deleteStateMaster;
export const addDistrict = stateMasterRepo.addDistrict;
export const removeDistrict = stateMasterRepo.removeDistrict;
export const replaceDistricts = stateMasterRepo.replaceDistricts;
export const seedStateMasters = stateMasterRepo.seedStateMasters;

export const getAllOccupations = occupationRepo.getAllOccupations;
export const getAllOccupationsAdmin = occupationRepo.getAllOccupationsAdmin;
export const createOccupation = occupationRepo.createOccupation;
export const updateOccupation = occupationRepo.updateOccupation;
export const deleteOccupation = occupationRepo.deleteOccupation;
export const seedOccupations = occupationRepo.seedOccupations;

export const getAllLandholdingUnits = landholdingUnitRepo.getAllLandholdingUnits;
export const getAllLandholdingUnitsAdmin = landholdingUnitRepo.getAllLandholdingUnitsAdmin;
export const getLandholdingUnitById = landholdingUnitRepo.getLandholdingUnitById;
export const createLandholdingUnit = landholdingUnitRepo.createLandholdingUnit;
export const updateLandholdingUnit = landholdingUnitRepo.updateLandholdingUnit;
export const deleteLandholdingUnit = landholdingUnitRepo.deleteLandholdingUnit;
export const seedLandholdingUnits = landholdingUnitRepo.seedLandholdingUnits;
