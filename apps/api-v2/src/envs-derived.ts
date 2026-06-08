const DURATION_FALLBACK_MS = 15 * 60 * 1000;

type DatabaseUrlInputs = {
  DATABASE_URL?: string;
  POSTGRES_HOST: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  POSTGRES_PORT: string;
};

type JwtDurationInputs = {
  JWT_ACCESS_TOKEN_EXPIRES_IN: string;
  JWT_REFRESH_TOKEN_EXPIRES_IN: string;
};

function parseExpiresToMs(value: string): number {
  const s = String(value).trim();
  const match = /^(\d+)(s|m|h|d)$/i.exec(s);
  if (!match) {
    return DURATION_FALLBACK_MS;
  }

  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === `s`) return n * 1000;
  if (unit === `m`) return n * 60 * 1000;
  if (unit === `h`) return n * 60 * 60 * 1000;
  if (unit === `d`) return n * 24 * 60 * 60 * 1000;
  return DURATION_FALLBACK_MS;
}

export function buildDatabaseUrl(data: DatabaseUrlInputs): string {
  if (data.DATABASE_URL?.trim()) return data.DATABASE_URL.trim();
  const user = encodeURIComponent(data.POSTGRES_USER);
  const password = encodeURIComponent(data.POSTGRES_PASSWORD);
  const host = data.POSTGRES_HOST.trim();
  const port = data.POSTGRES_PORT.trim();
  const db = data.POSTGRES_DB.trim();
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

export function deriveJwtTtls(data: JwtDurationInputs) {
  const JWT_ACCESS_TOKEN_EXPIRES_IN = parseExpiresToMs(data.JWT_ACCESS_TOKEN_EXPIRES_IN);
  const JWT_REFRESH_TOKEN_EXPIRES_IN = parseExpiresToMs(data.JWT_REFRESH_TOKEN_EXPIRES_IN);
  const JWT_ACCESS_TTL_SECONDS = Math.round(JWT_ACCESS_TOKEN_EXPIRES_IN / 1000);
  const JWT_REFRESH_TTL_SECONDS = Math.round(JWT_REFRESH_TOKEN_EXPIRES_IN / 1000);

  return {
    JWT_ACCESS_TOKEN_EXPIRES_IN,
    JWT_REFRESH_TOKEN_EXPIRES_IN,
    JWT_ACCESS_TTL_SECONDS,
    JWT_REFRESH_TTL_SECONDS,
  };
}
