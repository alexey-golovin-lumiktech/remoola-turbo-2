import * as Joi from 'joi'

const noVercelPostgresUrlProvided = /^null|undefined$/i.test(process.env.VERCEL_POSTGRES_URL)

export const validationOptions = { allowUnknown: true, abortEarly: true }

const postgres = {
  POSTGRES_HOST: Joi.string().default(`localhost`).required(),
  POSTGRES_PORT: Joi.number().default(5432).required(),
  POSTGRES_DATABASE: Joi.string().default(`wirebill`).required(),
  POSTGRES_USER: Joi.string().default(`wirebill`).required(),
  POSTGRES_PASSWORD: Joi.string().default(`wirebill`).required(),
  POSTGRES_DEBUG: Joi.boolean().default(false).required(),
  VERCEL_POSTGRES_URL: Joi.string().optional(), //!!!optional, when provided other options will be ignored
}

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(`staging`, `development`, `production`).required(),

  NEST_APP_PORT: Joi.number().required(),
  NEST_APP_HOST: Joi.string().default(`localhost`),
  NEST_APP_EXTERNAL_ORIGIN: Joi.string().required(),

  ...(noVercelPostgresUrlProvided && postgres),

  GOOGLE_API_KEY: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_PROJECT_ID: Joi.string().required(),
  GOOGLE_AUTH_URI: Joi.string().required(),
  GOOGLE_TOKEN_URI: Joi.string().required(),

  GOOGLE_AUTH_PROVIDER_X509_CERT_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default(`15m`).required(),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default(`168h`).required(),

  NODEMAILER_SMTP_HOST: Joi.string().required(),
  NODEMAILER_SMTP_PORT: Joi.number().required(),
  NODEMAILER_SMTP_USER: Joi.string().required(),
  NODEMAILER_SMTP_USER_PASS: Joi.string().required(),
  NODEMAILER_SMTP_DEFAULT_FROM: Joi.string().default(`noreply@wirebill.com`).required(),

  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),

  AWS_FILE_UPLOAD_MAX_SIZE_BYTES: Joi.number().default(50000000).required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_BUCKET: Joi.string().default(`wirebill`).required(),
})
