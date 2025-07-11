import z, { ZodArray, ZodDefault, ZodType, ZodTypeAny } from 'zod'

const ENVIRONMENT = { PRODUCTION: `production`, STAGING: `staging`, DEVELOPMENT: `development`, TEST: `test` } as const
const environments = Object.values(ENVIRONMENT)
export type Environment = (typeof ENVIRONMENT)[keyof typeof ENVIRONMENT]

const node = {
  NODE_ENV: z
    .union([
      z.literal(ENVIRONMENT.PRODUCTION),
      z.literal(ENVIRONMENT.STAGING),
      z.literal(ENVIRONMENT.DEVELOPMENT),
      z.literal(ENVIRONMENT.TEST),
    ])
    .default(`production`),
}

export function zBoolean(fallback = false): ZodType<boolean> {
  return z.preprocess(raw => {
    if (typeof raw === `string`) {
      const lowered = raw.trim().toLowerCase()
      if ([`true`, `1`, `yes`, `y`].includes(lowered)) return true
      if ([`false`, `0`, `no`, `n`].includes(lowered)) return false
    }
    return typeof raw === `boolean` ? raw : fallback
  }, z.boolean())
}

export function zArray<T extends ZodTypeAny>(itemSchema: T, fallback: z.infer<T>[] = []): ZodDefault<ZodArray<T>> {
  const arrWithDefault = z.array(itemSchema).default(fallback)
  return z.preprocess(raw => {
    if (typeof raw === `string`) {
      try {
        return JSON.parse(raw)
      } catch {
        return raw
          .split(`,`)
          .map(s => s.trim())
          .filter(Boolean)
      }
    }
    return raw
  }, arrWithDefault) as unknown as ZodDefault<ZodArray<T>>
}

const postgres = {
  POSTGRES_HOST: z.string().default(`127.0.0.1`),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DATABASE: z.string().default(`wirebill`),
  POSTGRES_USER: z.string().default(`wirebill`),
  POSTGRES_PASSWORD: z.string().default(`wirebill`),
  POSTGRES_DEBUG: zBoolean(false),
  POSTGRES_SSL: zBoolean(true),

  VERCEL_POSTGRES_URL: z.string().optional(),
}

const nest = {
  NEST_APP_PORT: z.coerce.number().default(3000),
  NEST_APP_HOST: z.string().default(`127.0.0.1`),
  NEST_APP_EXTERNAL_ORIGIN: z.string(),
}

const google = {
  GOOGLE_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALENDAR_SCOPES: zArray(z.string().min(1), []),
}

const jwt = {
  JWT_SECRET: z.string().default(`JWT_SECRET`),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default(`15m`),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default(`168h`),
}

const nodemailer = {
  NODEMAILER_SMTP_HOST: z.string(),
  NODEMAILER_SMTP_PORT: z.coerce.number(),
  NODEMAILER_SMTP_USER: z.string(),
  NODEMAILER_SMTP_USER_PASS: z.string(),
  NODEMAILER_SMTP_DEFAULT_FROM: z.string().default(`noreply@wirebill.com`),
}

const stripe = {
  STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
}

const aws = {
  AWS_FILE_UPLOAD_MAX_SIZE_BYTES: z.coerce.number().default(50000000),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_BUCKET: z.string().default(`wirebill`),
}

const logs = {
  LONG_LOGS_ENABLED: z.coerce.boolean().default(false),
}

const schema = z.object({
  ...node,
  ...postgres,
  ...nest,
  ...google,
  ...jwt,
  ...nodemailer,
  ...stripe,
  ...aws,
  ...logs,
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2))

export const envs = { ...parsed.data, ENVIRONMENT, environments }
