import * as Joi from 'joi'

export const validationOptions = { allowUnknown: true, abortEarly: true }

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(`development`, `production`).required(),

  NEST_APP_PORT: Joi.number().required(),
  NEST_APP_HOST: Joi.string().default(`localhost`),
  NEST_APP_EXTERNAL_ORIGIN: Joi.string().required(),

  POSTGRES_HOST: Joi.string().default(`localhost`).optional(),
  POSTGRES_PORT: Joi.number().default(5432).optional(),
  POSTGRES_DATABASE: Joi.string().default(`wirebill`).optional(),
  POSTGRES_USER: Joi.string().default(`wirebill`).optional(),
  POSTGRES_PASSWORD: Joi.string().default(`wirebill`).optional(),
  POSTGRES_DIALECT: Joi.string().default(`postgres`).optional(),
  POSTGRES_LOGGING: Joi.boolean().default(false).optional(),

  GOOGLE_API_KEY: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_PROJECT_ID: Joi.string().required(),
  GOOGLE_AUTH_URI: Joi.string().required(),
  GOOGLE_TOKEN_URI: Joi.string().required(),

  GOOGLE_AUTH_PROVIDER_X509_CERT_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default(`24h`).required(),
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
