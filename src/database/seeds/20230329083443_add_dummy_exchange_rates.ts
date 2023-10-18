import { Knex } from 'knex'

import { IExchangeRateCreate } from '@wirebill/shared-common/dtos'
import { MustUsefulCurrencyCode } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'
import { CurrencyCodeValue } from '@wirebill/shared-common/types'

const buildUniqCurrencyCodePairs = (): [CurrencyCodeValue, CurrencyCodeValue][] => {
  const source = Object.values<CurrencyCodeValue>(MustUsefulCurrencyCode)
  const target = Object.values<CurrencyCodeValue>(MustUsefulCurrencyCode)

  const result: [CurrencyCodeValue, CurrencyCodeValue][] = []
  for (const fromCurrency of source) {
    for (const toCurrency of target) {
      if (fromCurrency == toCurrency) continue

      const toCollect: [CurrencyCodeValue, CurrencyCodeValue] = [fromCurrency, toCurrency]
      if (result.some(([x1, x2]) => toCollect.includes(x1) && toCollect.includes(x2))) continue
      else result.push(toCollect)
    }
  }
  return result
}

export async function seed(knex: Knex): Promise<void> {
  const mustUsefulCurrencyCodes = Object.values(MustUsefulCurrencyCode)
  await knex
    .from(TableName.ExchangeRate)
    .whereIn(`to_currency`, mustUsefulCurrencyCodes)
    .orWhereIn(`from_currency`, mustUsefulCurrencyCodes)
    .del()

  const uniq = buildUniqCurrencyCodePairs()
  for (const [fromCurrency, toCurrency] of uniq) {
    const exchangeRate: IExchangeRateCreate = {
      fromCurrency,
      toCurrency,
      rate: 0.5555,
    }

    await knex.insert([exchangeRate]).into(TableName.ExchangeRate).returning(`*`)
    console.count(`[SUCCESS CREATED DUMMY EXCHANGE RATE RECORD]`)
  }

  console.log(`[DONE]`)
}
