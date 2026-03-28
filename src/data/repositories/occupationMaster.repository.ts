import { OccupationMaster, IOccupationMaster } from '../models/OccupationMaster';

// 5-minute cache
let cache: { docs: IOccupationMaster[]; expiresAt: number } | null = null;

function invalidate() { cache = null; }

export const getAllOccupations = async (): Promise<IOccupationMaster[]> => {
  if (cache && Date.now() < cache.expiresAt) return cache.docs;
  const docs = await OccupationMaster.find({ active: true }).sort({ order: 1, label: 1 }).lean() as unknown as IOccupationMaster[];
  cache = { docs, expiresAt: Date.now() + 5 * 60 * 1000 };
  return docs;
};

export const getAllOccupationsAdmin = async (): Promise<IOccupationMaster[]> => {
  return OccupationMaster.find().sort({ order: 1, label: 1 }).lean() as unknown as IOccupationMaster[];
};

export const createOccupation = async (id: string, label: string, order = 0): Promise<IOccupationMaster> => {
  const doc = await OccupationMaster.create({ id, label, active: true, order });
  invalidate();
  return doc.toObject() as unknown as IOccupationMaster;
};

export const updateOccupation = async (
  id: string,
  updates: Partial<Pick<IOccupationMaster, 'label' | 'active' | 'order'>>
): Promise<IOccupationMaster | null> => {
  const doc = await OccupationMaster.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean() as unknown as IOccupationMaster | null;
  invalidate();
  return doc;
};

export const deleteOccupation = async (id: string): Promise<boolean> => {
  const result = await OccupationMaster.deleteOne({ id });
  invalidate();
  return result.deletedCount > 0;
};

export const SEED_OCCUPATIONS = [
  { id: 'farmer',        label: 'Farmer',                order: 1 },
  { id: 'farm_owner',    label: 'Farm Owner',             order: 2 },
  { id: 'agronomist',    label: 'Agronomist',             order: 3 },
  { id: 'agri_labourer', label: 'Agricultural Labourer',  order: 4 },
  { id: 'trader',        label: 'Trader',                 order: 5 },
  { id: 'other',         label: 'Other',                  order: 6 },
];

export const seedOccupations = async (): Promise<void> => {
  await Promise.all(
    SEED_OCCUPATIONS.map(({ id, label, order }) =>
      OccupationMaster.updateOne(
        { id },
        { $setOnInsert: { id, label, active: true, order } },
        { upsert: true }
      )
    )
  );
};
