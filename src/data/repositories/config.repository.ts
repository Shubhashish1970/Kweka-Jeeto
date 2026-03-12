import { Config, IConfig } from '../models/Config';

/** When MongoDB is unreachable (e.g. ENOTFOUND, timeout), return null so callers can use env fallbacks. */
const catchConfigError = <T>(fn: () => Promise<T>): Promise<T | null> =>
  fn().catch(() => null);

export const getConfig = async (key: string): Promise<IConfig | null> => {
  return catchConfigError(() => Config.findOne({ key }).lean() as Promise<IConfig | null>);
};

export const getConfigValue = async <T = unknown>(key: string): Promise<T | null> => {
  const doc = await catchConfigError(() => Config.findOne({ key }).lean());
  return doc ? (doc.value as T) : null;
};

export const getAllConfig = async (): Promise<Record<string, unknown>> => {
  const docs = await catchConfigError(() => Config.find({}).lean());
  if (!docs || !Array.isArray(docs)) return {};
  return docs.reduce((acc: Record<string, unknown>, d: { key: string; value: unknown }) => {
    acc[d.key] = d.value;
    return acc;
  }, {});
};

export const setConfig = async (
  key: string,
  value: unknown,
  updatedBy?: string
): Promise<IConfig> => {
  const doc = await Config.findOneAndUpdate(
    { key },
    { value, updatedBy, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return doc as unknown as IConfig;
};

export const setConfigBulk = async (
  entries: Array<{ key: string; value: unknown }>,
  updatedBy?: string
): Promise<void> => {
  await Promise.all(entries.map((e) => setConfig(e.key, e.value, updatedBy)));
};
