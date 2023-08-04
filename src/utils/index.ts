import { ClassConstructor, plainToInstance } from 'class-transformer'
import * as crypto from 'crypto'
import { sumBy } from 'lodash'

import { CurrencyCode } from '@wirebill/shared-common/enums'
import { CurrencyCodeValue, KnexCount } from '@wirebill/shared-common/types'

export const generatePasswordHash = (params = { password: ``, salt: `` }): string => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  return crypto.createHmac(`sha512`, params.salt).update(params.password).digest(`hex`)
}

export const generatePasswordHashSalt = (rounds = 10) => {
  return crypto.randomBytes(Math.ceil(rounds / 2)).toString(`hex`)
}

export const passwordsIsEqual = (params = { incomingPass: ``, password: ``, salt: `` }): boolean => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  const hash = crypto.createHmac(`sha512`, params.salt).update(params.incomingPass).digest(`hex`)
  return params.password === hash
}

export const generateStrongPassword = (): string => {
  const lowerChars = `abcdefghijklmnopqrstuvwxyz`
  const upperChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
  const intChars = `0123456789`
  const specChars = `#?!@$%^&*`
  const password = []

  const getRandomValue = (source = ``) => source[Math.ceil(Math.random() * source.length)] ?? getRandomValue(source)

  for (let i = 0; i < 3; i++) {
    const randomValue = {
      upperKey: getRandomValue(upperChars),
      intKey: getRandomValue(intChars),
      specKey: getRandomValue(specChars),
      lowerKey: getRandomValue(lowerChars),
    }
    password.push(...Object.values(randomValue))
  }

  return encodeURIComponent(password.join(``))
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

export function formatToCurrency(value: number, currency: CurrencyCodeValue = CurrencyCode.USD, replaceDoubleZero?: boolean) {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale
  const formattedValue = new Intl.NumberFormat(locale, { style: `currency`, currency }).format(value)
  if (replaceDoubleZero) return formattedValue.replace(`.00`, ``)
  return formattedValue
}

export const calculateInvoiceTotalAndSubtotal = (invoiceItems: any[], tax: number) => {
  const subtotal = sumBy(invoiceItems, `amount`)
  const total = subtotal + (subtotal / 100) * tax
  return { subtotal, total }
}

export * from './provided-envs-checking.util'
export * as emailTemplating from './email-templating'
export * from './plainToInstance'
export * from './deepDiff'
