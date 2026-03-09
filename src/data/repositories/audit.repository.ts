import { AuditLog, IAuditLog } from '../models/AuditLog';

export const createAuditLog = async (
  action: string,
  userId?: string,
  details?: Record<string, unknown>
): Promise<IAuditLog> => {
  const log = new AuditLog({ action, userId, details });
  return log.save();
};
