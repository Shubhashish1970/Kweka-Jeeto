import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  // Only throw when missing and no default was provided (defaultValue === undefined)
  if (isProduction && (value === undefined || value === '') && defaultValue === undefined) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value ?? defaultValue ?? '';
};

// Use defaults so the container always starts and listens on PORT (Cloud Run health check).
// Missing/empty secrets are handled at runtime by each feature (webhook, message service, admin).
export const env = {
  whatsapp: {
    accessToken: getEnv('WHATSAPP_ACCESS_TOKEN', ''),
    phoneNumberId: getEnv('WHATSAPP_PHONE_NUMBER_ID', ''),
    verifyToken: getEnv('WHATSAPP_VERIFY_TOKEN', ''),
    wabaId: getEnv('WABA_ID', ''),
    flowId: getEnv('FLOW_ID', ''),
  },
  mongodb: {
    uri: getEnv('MONGODB_URI', ''),
  },
  admin: {
    password: getEnv('ADMIN_PASSWORD', ''),
    jwtSecret: getEnv('ADMIN_JWT_SECRET', ''),
  },
  port: parseInt(getEnv('PORT', '8080'), 10),
  nodeEnv: getEnv('NODE_ENV', 'production'),
  apiBaseUrl: getEnv('API_BASE_URL', ''),
};

export const isProd = env.nodeEnv === 'production';
