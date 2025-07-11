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
    .default(ENVIRONMENT.PRODUCTION),
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

const database = {
  DATABASE_URL: z.string().optional(),
}

const nest = {
  NEST_APP_PORT: z.coerce.number().default(3000),
  NEST_APP_HOST: z.string().default(`127.0.0.1`),
  NEST_APP_EXTERNAL_ORIGIN: z.string().default(`NEST_APP_EXTERNAL_ORIGIN`),
}

const google = {
  GOOGLE_API_KEY: z.string().default(`GOOGLE_API_KEY`),
  GOOGLE_CLIENT_ID: z.string().default(`GOOGLE_CLIENT_ID`),
  GOOGLE_CLIENT_SECRET: z.string().default(`GOOGLE_CLIENT_SECRET`),
  GOOGLE_CALENDAR_SCOPES: zArray(z.string().min(1), []),
}

const jwt = {
  JWT_SECRET: z.string().default(`JWT_SECRET`),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default(`15m`),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default(`168h`),
}

const nodemailer = {
  NODEMAILER_SMTP_HOST: z.string().default(`NODEMAILER_SMTP_HOST`),
  NODEMAILER_SMTP_PORT: z.coerce.number(),
  NODEMAILER_SMTP_USER: z.string().default(`NODEMAILER_SMTP_USER`),
  NODEMAILER_SMTP_USER_PASS: z.string().default(`NODEMAILER_SMTP_USER_PASS`),
  NODEMAILER_SMTP_DEFAULT_FROM: z.string().default(`noreply@wirebill.com`),
}

const stripe = {
  STRIPE_PUBLISHABLE_KEY: z.string().default(`STRIPE_PUBLISHABLE_KEY`),
  STRIPE_SECRET_KEY: z.string().default(`STRIPE_SECRET_KEY`),
}

const aws = {
  AWS_FILE_UPLOAD_MAX_SIZE_BYTES: z.coerce.number().default(50000000),
  AWS_ACCESS_KEY_ID: z.string().default(`AWS_ACCESS_KEY_ID`),
  AWS_SECRET_ACCESS_KEY: z.string().default(`AWS_SECRET_ACCESS_KEY`),
  AWS_REGION: z.string().default(`AWS_REGION`),
  AWS_BUCKET: z.string().default(`wirebill`),
}

const logs = {
  LONG_LOGS_ENABLED: z.coerce.boolean().default(false),
}

const app = {
  ADMIN_EMAIL: z.string().default(`simplelogin-newsletter.djakm@simplelogin.com`),
}

const schema = z.object({
  ...node,
  ...database,
  ...nest,
  ...google,
  ...jwt,
  ...nodemailer,
  ...stripe,
  ...aws,
  ...logs,
  ...app,
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2))

export const envs = { ...parsed.data, ENVIRONMENT, environments }

export const check = (...args: string[]) => {
  for (const arg of args) {
    if (!(arg in envs)) throw new Error(`Missing env: ${arg}`)
    if (envs[arg] === arg) throw new Error(`env: ${arg} is not provided`)
  }
}
