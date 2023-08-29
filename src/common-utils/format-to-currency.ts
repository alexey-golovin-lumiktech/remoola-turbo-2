import { CurrencyCode } from '@wirebill/shared-common/enums'
import { CurrencyCodeValue } from '@wirebill/shared-common/types'

export const formatToCurrency = (value: number, currency: CurrencyCodeValue = CurrencyCode.USD, replaceDoubleZero?: boolean) => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale
  const formattedValue = new Intl.NumberFormat(locale, { style: `currency`, currency }).format(value)
  if (replaceDoubleZero) return formattedValue.replace(`.00`, ``)
  return formattedValue
}
