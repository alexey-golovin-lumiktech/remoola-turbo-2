import * as Joi from 'joi'

export const validationOptions = { allowUnknown: true, abortEarly: true }

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(`development`, `production`).required(),

  PORT: Joi.number().required(),

  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DIALECT: Joi.string().required(),
  POSTGRES_LOGGING: Joi.boolean().required(),

  GOOGLE_API_KEY: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_PROJECT_ID: Joi.string().required(),
  GOOGLE_AUTH_URI: Joi.string().required(),
  GOOGLE_TOKEN_URI: Joi.string().required(),
  GOOGLE_AUTH_PROVIDER_X509_CERT_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().required(),

  HTTP_BASIC_USER: Joi.string().required(),
  HTTP_BASIC_PASS: Joi.string().required(),

  NODEMAILER_SMTP_HOST: Joi.string().required(),
  NODEMAILER_SMTP_PORT: Joi.number().required(),
  NODEMAILER_SMTP_USER: Joi.string().required(),
  NODEMAILER_SMTP_USER_PASS: Joi.string().required(),
  NODEMAILER_SMTP_DEFAULT_FROM: Joi.string().required(),

  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  FRONTEND_BASE_URL: Joi.string().required(),
})
