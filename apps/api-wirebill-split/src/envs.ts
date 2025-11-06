export const NODE_ENV = process.env.NODE_ENV || `production`;

export const FORCE_PAYMENT_RESULT = process.env.FORCE_PAYMENT_RESULT;

export const S3_BUCKET = process.env.S3_BUCKET;
export const AWS_REGION = process.env.AWS_REGION;
export const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE;

export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
export const COOKIE_SECURE = process.env.COOKIE_SECURE;

export const POSTGRES_TIMEZONE = process.env.POSTGRES_TIMEZONE || `UTC`;
export const POSTGRES_HOST = process.env.POSTGRES_HOST || `127.0.0.1`;
export const POSTGRES_PORT = process.env.POSTGRES_PORT || `5433`;
export const POSTGRES_USER = process.env.POSTGRES_USER || `wirebill`;
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || `wirebill`;
export const POSTGRES_DB = process.env.POSTGRES_DB || `wirebill`;
export const POSTGRES_SSL = process.env.POSTGRES_SSL;

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || `JWT_ACCESS_SECRET`;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `JWT_REFRESH_SECRET`;

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

export const MINUTES_15MS = 900000 as const;
export const DAYS_7MS = 604800000 as const;

export const JWT_ACCESS_TTL = MINUTES_15MS;
export const JWT_REFRESH_TTL = DAYS_7MS;

export const JWT_ACCESS_COOKIE = `access_token` as const; // according to http protocol
export const JWT_REFRESH_COOKIE = `refresh_token` as const; // according to http protocol
