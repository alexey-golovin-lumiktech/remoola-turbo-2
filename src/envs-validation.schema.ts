import * as Joi from 'joi'

export const validationOptions = { allowUnknown: true, abortEarly: true }

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(`development`, `production`).required(),
  PORT: Joi.number().default(8080).required(),
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DIALECT: Joi.string().required(),
  POSTGRES_LOGGING: Joi.boolean().required()
})
