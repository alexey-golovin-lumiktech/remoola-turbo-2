import { ClassConstructor, plainToInstance } from 'class-transformer'
import * as crypto from 'crypto'
import { existsSync } from 'fs'
import { sumBy } from 'lodash'
import { resolve } from 'path'

import { currencyCode, KnexCount } from '../shared-types'

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

export const toResponse = <T, V>(cls: ClassConstructor<T>, data: V | V[]) => {
  const opts = { excludeExtraneousValues: true, enableImplicitConversion: true, exposeDefaultValues: true, exposeUnsetFields: true }
  return plainToInstance(cls, data, opts)
}

export const queryBuilder = {
  makeSqlIn: (arr: (string | number)[]): string => arr.map(x => `'${x}'`).join(`,`),
}

export const getKnexCount = ([knexCount]: KnexCount[]): number => {
  return knexCount?.count ? Number(knexCount.count) : 0
}

export const currencyFormatters = {
  [currencyCode.USD]: new Intl.NumberFormat(`en-US`, { style: `currency`, currency: `usd` }),
}

export const calculateInvoiceTotalAndSubtotal = (invoiceItems: any[], tax: number) => {
  const subtotal = sumBy(invoiceItems, `amount`)
  const total = subtotal + (subtotal / 100) * tax
  return { subtotal, total }
}

export * from './provided-envs-checking.util'
export * from './email-templating'
export * from './plainToInstance'
