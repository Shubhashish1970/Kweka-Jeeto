import { Config, IConfig } from '../models/Config';

export const getConfig = async (key: string): Promise<IConfig | null> => {
  return Config.findOne({ key }).lean() as Promise<IConfig | null>;
};

export const getConfigValue = async <T = unknown>(key: string): Promise<T | null> => {
  const doc = await Config.findOne({ key }).lean();
  return doc ? (doc.value as T) : null;
};

export const getAllConfig = async (): Promise<Record<string, unknown>> => {
  const docs = await Config.find({}).lean();
  return docs.reduce((acc, d) => {
    acc[d.key] = d.value;
    return acc;
  }, {} as Record<string, unknown>);
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
