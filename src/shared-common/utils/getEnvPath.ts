import { existsSync } from 'fs'
import { resolve } from 'path'

// @NOTE: this fn should be defined here only
export function getEnvPath(dest: string): string {
  const env = process.env.NODE_ENV ?? null
  const fallback: string = resolve(`${dest}/.env`)
  const filename: string = env != null ? `.env.${env}` : `.env.development`
  let filePath: string = resolve(`${dest}/${filename}`)

  if (!existsSync(filePath)) filePath = fallback

  return filePath
}
