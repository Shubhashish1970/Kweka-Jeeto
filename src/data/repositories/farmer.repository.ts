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
  flow_token?: string;
}

export const createFarmer = async (data: CreateFarmerData): Promise<IFarmer> => {
  const farmer = new Farmer(data);
  return farmer.save();
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
