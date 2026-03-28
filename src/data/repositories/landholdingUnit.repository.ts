import { LandholdingUnit, ILandholdingUnit } from '../models/LandholdingUnit';

// 5-minute cache
let cache: { docs: ILandholdingUnit[]; expiresAt: number } | null = null;

function invalidate() { cache = null; }

export const getAllLandholdingUnits = async (): Promise<ILandholdingUnit[]> => {
  if (cache && Date.now() < cache.expiresAt) return cache.docs;
  const docs = await LandholdingUnit.find({ active: true }).sort({ order: 1, label: 1 }).lean() as unknown as ILandholdingUnit[];
  cache = { docs, expiresAt: Date.now() + 5 * 60 * 1000 };
  return docs;
};

export const getAllLandholdingUnitsAdmin = async (): Promise<ILandholdingUnit[]> => {
  return LandholdingUnit.find().sort({ order: 1, label: 1 }).lean() as unknown as ILandholdingUnit[];
};

export const getLandholdingUnitById = async (id: string): Promise<ILandholdingUnit | null> => {
  // Check cache first
  if (cache && Date.now() < cache.expiresAt) {
    return cache.docs.find((d) => d.id === id) ?? null;
  }
  return LandholdingUnit.findOne({ id }).lean() as unknown as ILandholdingUnit | null;
};

export const createLandholdingUnit = async (
  id: string, label: string, conversion_factor: number, order = 0
): Promise<ILandholdingUnit> => {
  const doc = await LandholdingUnit.create({ id, label, conversion_factor, active: true, order });
  invalidate();
  return doc.toObject() as unknown as ILandholdingUnit;
};

export const updateLandholdingUnit = async (
  id: string,
  updates: Partial<Pick<ILandholdingUnit, 'label' | 'conversion_factor' | 'active' | 'order'>>
): Promise<ILandholdingUnit | null> => {
  const doc = await LandholdingUnit.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean() as unknown as ILandholdingUnit | null;
  invalidate();
  return doc;
};

export const deleteLandholdingUnit = async (id: string): Promise<boolean> => {
  const result = await LandholdingUnit.deleteOne({ id });
  invalidate();
  return result.deletedCount > 0;
};

export const SEED_LANDHOLDING_UNITS = [
  { id: 'acre',     label: 'Acre',     conversion_factor: 1,        order: 1 },
  { id: 'hectare',  label: 'Hectare',  conversion_factor: 2.47105,  order: 2 },
  { id: 'bigha',    label: 'Bigha',    conversion_factor: 0.619,    order: 3 },
  { id: 'gunta',    label: 'Gunta',    conversion_factor: 0.025,    order: 4 },
  { id: 'cent',     label: 'Cent',     conversion_factor: 0.01,     order: 5 },
];

export const seedLandholdingUnits = async (): Promise<void> => {
  await Promise.all(
    SEED_LANDHOLDING_UNITS.map(({ id, label, conversion_factor, order }) =>
      LandholdingUnit.updateOne(
        { id },
        { $setOnInsert: { id, label, conversion_factor, active: true, order } },
        { upsert: true }
      )
    )
  );
};
