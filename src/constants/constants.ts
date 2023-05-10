import { getEnvPath } from '../common/getEnvPath'

export const constants = {
  INVALID_CREDENTIALS: `Invalid Credentials`,
  ADMIN_NOT_FOUND: `Admin not found`,
  NOT_FOUND: `Not found`,
  INVALID_PASSWORD: `Invalid password`,
  INVALID_EMAIL: `Invalid email`,
  TEMPORARY_PASSWORD_LIFETIME_HOURS: 3,
  ENV_FILE_PATH: getEnvPath(process.cwd())
} as const
