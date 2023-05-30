import { getEnvPath } from '../utils'

export const constants = {
  INVALID_CREDENTIALS: `Invalid Credentials`,
  ADMIN_NOT_FOUND: `Admin not found`,
  NOT_FOUND: `Not found`,
  INVALID_PASSWORD: `Invalid password`,
  PASSWORD_NOT_SET_YET: `Consumer password is not set yet. Try using a different way to log in to the app, or restore your password `,
  INVALID_EMAIL: `Invalid email`,
  TEMPORARY_PASSWORD_LIFETIME_HOURS: 3,
  ENV_FILE_PATH: getEnvPath(process.cwd()),
  defaultDueDateInDays30: 30,
} as const
