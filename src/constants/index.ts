import { existsSync } from 'fs'
import { resolve } from 'path'

export function getEnvPath(dest: string): string {
  const env: string | undefined = process.env.NODE_ENV
  const fallback: string = resolve(`${dest}/.env`)
  const filename: string = env ? `.env.${env}` : `.env.development`
  let filePath: string = resolve(`${dest}/${filename}`)

  if (!existsSync(filePath)) filePath = fallback

  return filePath
}

export const INVALID_CREDENTIALS = `Invalid Credentials`
export const ADMIN_NOT_FOUND = `Admin not found`
export const NOT_FOUND = `Not found`
export const INVALID_PASSWORD = `Invalid password`
export const PASSWORD_NOT_SET_YET = `Consumer password is not set yet. Try using a different way to log in to the app, or restore your password `
export const INVALID_EMAIL = `Invalid email`
export const TEMPORARY_PASSWORD_LIFETIME_HOURS = 3
export const ENV_FILE_PATH = getEnvPath(process.cwd())
export const DEFAULT_DUE_DATE_IN_DAYS30 = 30
export const PASSWORD_RE = /(?!.* )(?=(.*[A-Z]){2,})(?=.*?[a-z])(?=.*[1-9]{1,})(?=.*?[#?!@$%^&*-]).{8,}$/
