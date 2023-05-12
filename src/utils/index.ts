import * as crypto from 'crypto'
import { existsSync } from 'fs'
import { resolve } from 'path'

export const generatePasswordHash = (params = { password: ``, salt: `` }): string => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  return crypto.createHmac(`sha512`, params.salt).update(params.password).digest(`hex`)
}

export const generatePasswordHashSalt = (rounds = 10) => {
  return crypto.randomBytes(Math.ceil(rounds / 2)).toString(`hex`)
}

export const validatePassword = (params = { incomingPass: ``, password: ``, salt: `` }): boolean => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  const hash = crypto.createHmac(`sha512`, params.salt).update(params.incomingPass).digest(`hex`)
  return params.password === hash
}

export const generateStrongPassword = (): string => {
  const lowerChars = `abcdefghijklmnopqrstuvwxyz`
  const upperChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
  const keyListInt = `0123456789`
  const keyListSpec = `#?!@$%^&*`
  const password = []

  const getRandomValue = (from = ``) => {
    return from[Math.ceil(Math.random() * from.length)] ?? getRandomValue(from)
  }

  for (let i = 0; i < 3; i++) {
    const randomValue = {
      upperKey: getRandomValue(upperChars),
      intKey: getRandomValue(keyListInt),
      specKey: getRandomValue(keyListSpec),
      lowerKey: getRandomValue(lowerChars),
    }
    password.push(...Object.values(randomValue))
  }

  return encodeURIComponent(password.join(``))
}

export function getEnvPath(dest: string): string {
  const env: string | undefined = process.env.NODE_ENV
  const fallback: string = resolve(`${dest}/.env`)
  const filename: string = env ? `.env.${env}` : `.env.development`
  let filePath: string = resolve(`${dest}/${filename}`)

  if (!existsSync(filePath)) filePath = fallback

  return filePath
}
