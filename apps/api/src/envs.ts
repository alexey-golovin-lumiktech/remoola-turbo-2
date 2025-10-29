import { type JwtSignOptions } from '@nestjs/jwt';

// with defaults
export const NODE_ENV = process.env.NODE_ENV || `production`;
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? `1d`) as JwtSignOptions[`expiresIn`];
export const JWT_REFRESH_TTL = (process.env.JWT_REFRESH_TTL || `7d`) as JwtSignOptions[`expiresIn`];
export const JWT_ACCESS_TTL = (process.env.JWT_ACCESS_TTL || `15m`) as JwtSignOptions[`expiresIn`];
export const JWT_SECRET = process.env.JWT_SECRET || `JWT_SECRET`;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `JWT_REFRESH_SECRET`;

export const FORCE_PAYMENT_RESULT = process.env.FORCE_PAYMENT_RESULT;
export const S3_BUCKET = process.env.S3_BUCKET;
export const AWS_REGION = process.env.AWS_REGION;
export const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE;
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

export const POSTGRES_TIMEZONE = process.env.POSTGRES_TIMEZONE || `UTC`;
export const POSTGRES_HOST = process.env.POSTGRES_HOST || `127.0.0.1`;
export const POSTGRES_PORT = process.env.POSTGRES_PORT || `5432`;
export const POSTGRES_USER = process.env.POSTGRES_USER || `remoola`;
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || `remoola`;
export const POSTGRES_DB = process.env.POSTGRES_DB || `remoola`;
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

// boolean string true|false|undefined
export const POSTGRES_SSL = process.env.POSTGRES_SSL;
export const COOKIE_SECURE = process.env.COOKIE_SECURE;
