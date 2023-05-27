import { ValueOf } from '../shared-types'

export type CurrencyCode = ValueOf<typeof currencyCode>
export const currencyCode = { USD: `USD` } as const
