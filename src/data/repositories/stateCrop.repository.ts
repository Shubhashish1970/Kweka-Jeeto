import { StateCrop, IStateCrop, ICropEntry } from '../models/StateCrop';

// ---------------------------------------------------------------------------
// 5-minute in-memory cache (avoids redundant DB fetches on every flow load)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  doc: IStateCrop | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(state: string): IStateCrop | null | undefined {
  const entry = cache.get(state);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(state);
    return undefined;
  }
  return entry.doc;
}

function cacheSet(state: string, doc: IStateCrop | null): void {
  cache.set(state, { doc, expiresAt: Date.now() + CACHE_TTL_MS });
}

function cacheInvalidate(state: string): void {
  cache.delete(state);
}

// ---------------------------------------------------------------------------
// Repository methods
// ---------------------------------------------------------------------------

export const getAllStateCrops = async (): Promise<IStateCrop[]> => {
  return StateCrop.find().sort({ stateLabel: 1 }).lean() as unknown as IStateCrop[];
};

export const getStateCrop = async (state: string): Promise<IStateCrop | null> => {
  const cached = cacheGet(state);
  if (cached !== undefined) return cached;

  const doc = await StateCrop.findOne({ state }).lean() as unknown as IStateCrop | null;
  cacheSet(state, doc);
  return doc;
};

export const upsertStateCrop = async (
  state: string,
  stateLabel: string,
  crops: ICropEntry[]
): Promise<IStateCrop> => {
  const doc = await StateCrop.findOneAndUpdate(
    { state },
    { $set: { stateLabel, crops } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean() as unknown as IStateCrop;
  cacheInvalidate(state);
  return doc;
};

export const addCropToState = async (
  state: string,
  crop: ICropEntry
): Promise<IStateCrop | null> => {
  const doc = await StateCrop.findOneAndUpdate(
    { state },
    { $push: { crops: crop } },
    { new: true }
  ).lean() as unknown as IStateCrop | null;
  cacheInvalidate(state);
  return doc;
};

export const updateCropInState = async (
  state: string,
  cropId: string,
  updates: Partial<ICropEntry>
): Promise<IStateCrop | null> => {
  const setFields: Record<string, unknown> = {};
  if (updates.title !== undefined) setFields['crops.$.title'] = updates.title;
  if (updates.description !== undefined) setFields['crops.$.description'] = updates.description;
  if (updates.id !== undefined) setFields['crops.$.id'] = updates.id;

  const doc = await StateCrop.findOneAndUpdate(
    { state, 'crops.id': cropId },
    { $set: setFields },
    { new: true }
  ).lean() as unknown as IStateCrop | null;
  cacheInvalidate(state);
  return doc;
};

export const deleteCropFromState = async (
  state: string,
  cropId: string
): Promise<IStateCrop | null> => {
  const doc = await StateCrop.findOneAndUpdate(
    { state },
    { $pull: { crops: { id: cropId } } },
    { new: true }
  ).lean() as unknown as IStateCrop | null;
  cacheInvalidate(state);
  return doc;
};

/**
 * Seeds state-crop data using $setOnInsert — never overwrites existing admin edits.
 * Safe to call on every boot.
 */
export const seedStateCrops = async (
  data: Array<{ state: string; stateLabel: string; crops: ICropEntry[] }>
): Promise<void> => {
  await Promise.all(
    data.map(({ state, stateLabel, crops }) =>
      StateCrop.updateOne(
        { state },
        { $setOnInsert: { state, stateLabel, crops } },
        { upsert: true }
      )
    )
  );
};
