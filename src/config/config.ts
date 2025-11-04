import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  telegram: {
    botToken: string;
  };
  conference: {
    name: string;
    date: string;
    location: string;
    ticketPrice: number;
  };
  payme: {
    merchantId: string;
    secretKey: string;
    endpoint: string;
  };
  click: {
    merchantId: string;
    serviceId: string;
    secretKey: string;
    merchantUserId: string;
  };
  server: {
    port: number;
    webhookDomain: string;
  };
  database: {
    path: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

export const config: Config = {
  telegram: {
    botToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
  },
  conference: {
    name: getEnvVar('CONFERENCE_NAME', 'Tech Conference 2024'),
    date: getEnvVar('CONFERENCE_DATE', '2024-12-15'),
    location: getEnvVar('CONFERENCE_LOCATION', 'Tashkent, Uzbekistan'),
    ticketPrice: parseInt(getEnvVar('TICKET_PRICE', '100000')),
  },
  payme: {
    merchantId: getEnvVar('PAYME_MERCHANT_ID'),
    secretKey: getEnvVar('PAYME_SECRET_KEY'),
    endpoint: getEnvVar('PAYME_ENDPOINT', 'https://checkout.paycom.uz'),
  },
  click: {
    merchantId: getEnvVar('CLICK_MERCHANT_ID'),
    serviceId: getEnvVar('CLICK_SERVICE_ID'),
    secretKey: getEnvVar('CLICK_SECRET_KEY'),
    merchantUserId: getEnvVar('CLICK_MERCHANT_USER_ID'),
  },
  server: {
    port: parseInt(getEnvVar('PORT', '3000')),
    webhookDomain: getEnvVar('WEBHOOK_DOMAIN', 'http://localhost:3000'),
  },
  database: {
    path: getEnvVar('DATABASE_PATH', './database.sqlite'),
  },
};
