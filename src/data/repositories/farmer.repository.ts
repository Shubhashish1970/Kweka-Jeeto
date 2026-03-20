import { Farmer, IFarmer } from '../models/Farmer';

export interface FarmerFilter {
  state?: string;
  crop?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreateFarmerData {
  wa_id: string;
  farmer_name: string;
  age: string;
  profession: string;
  state: string;
  district: string;
  crop: string;
  advisory_start_date?: Date;
  flow_token?: string;
  language?: string;
}

export const createFarmer = async (data: CreateFarmerData): Promise<IFarmer> => {
  const farmer = new Farmer(data);
  return farmer.save();
};

/**
 * Upsert farmer by wa_id — idempotent.
 * Used by the flow endpoint so that duplicate nfm_reply webhook events don't create duplicates.
 */
export const upsertFarmer = async (data: CreateFarmerData): Promise<IFarmer> => {
  const result = await Farmer.findOneAndUpdate(
    { wa_id: data.wa_id },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return result as unknown as IFarmer;
};

export const getFarmerByWaId = async (waId: string): Promise<IFarmer | null> => {
  return Farmer.findOne({ wa_id: waId }).sort({ createdAt: -1 }).lean() as unknown as Promise<IFarmer | null>;
};

export const updateFarmerById = async (
  id: string,
  data: Partial<CreateFarmerData>
): Promise<IFarmer | null> => {
  return Farmer.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as unknown as Promise<IFarmer | null>;
};

export const deleteFarmerById = async (id: string): Promise<void> => {
  await Farmer.findByIdAndDelete(id);
};

export const getFarmers = async (
  filter: FarmerFilter = {},
  options: PaginationOptions = {}
): Promise<{ farmers: IFarmer[]; total: number }> => {
  const { page = 1, limit = 50 } = options;
  const query: Record<string, unknown> = {};

  if (filter.state) query.state = filter.state;
  if (filter.crop) query.crop = filter.crop;
  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) (query.createdAt as Record<string, Date>).$gte = filter.startDate;
    if (filter.endDate) (query.createdAt as Record<string, Date>).$lte = filter.endDate;
  }
  if (filter.search) {
    query.$or = [
      { farmer_name: { $regex: filter.search, $options: 'i' } },
      { district: { $regex: filter.search, $options: 'i' } },
      { wa_id: { $regex: filter.search, $options: 'i' } },
    ];
  }

  const [farmers, total] = await Promise.all([
    Farmer.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Farmer.countDocuments(query),
  ]);

  return { farmers: farmers as unknown as IFarmer[], total };
};

export const getFarmerCount = async (filter: FarmerFilter = {}): Promise<number> => {
  const query: Record<string, unknown> = {};
  if (filter.state) query.state = filter.state;
  if (filter.crop) query.crop = filter.crop;
  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) (query.createdAt as Record<string, Date>).$gte = filter.startDate;
    if (filter.endDate) (query.createdAt as Record<string, Date>).$lte = filter.endDate;
  }
  return Farmer.countDocuments(query);
};

export const getFarmersForExport = async (filter: FarmerFilter = {}): Promise<IFarmer[]> => {
  const query: Record<string, unknown> = {};
  if (filter.state) query.state = filter.state;
  if (filter.crop) query.crop = filter.crop;
  if (filter.startDate || filter.endDate) {
    query.createdAt = {};
    if (filter.startDate) (query.createdAt as Record<string, Date>).$gte = filter.startDate;
    if (filter.endDate) (query.createdAt as Record<string, Date>).$lte = filter.endDate;
  }
  return Farmer.find(query).sort({ createdAt: -1 }).lean() as unknown as Promise<IFarmer[]>;
};

/** Start of today in UTC (00:00:00.000) for date comparison */
function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Farmers who have advisory_start_date on or before today and have not been sent advisory today */
export const getFarmersDueForDailyAdvisory = async (): Promise<IFarmer[]> => {
  const today = startOfTodayUtc();
  const query = {
    advisory_start_date: { $exists: true, $ne: null, $lte: today },
    $or: [
      { last_advisory_sent_at: { $exists: false } },
      { last_advisory_sent_at: null },
      { last_advisory_sent_at: { $lt: today } },
    ],
  };
  return Farmer.find(query).lean() as unknown as Promise<IFarmer[]>;
};

export const updateLastAdvisorySentAt = async (farmerId: string): Promise<void> => {
  await Farmer.updateOne({ _id: farmerId }, { $set: { last_advisory_sent_at: new Date() } });
};
