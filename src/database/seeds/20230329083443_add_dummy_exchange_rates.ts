import { Knex } from 'knex'

import { IExchangeRateCreate } from '@wirebill/shared-common/dtos'
import { MustUsefulCurrencyCode } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

export async function seed(knex: Knex): Promise<void> {
  const mustUsefulCurrencyCodes = Object.values(MustUsefulCurrencyCode)
  await knex
    .from(TableName.ExchangeRate)
    .whereIn(`to_currency`, mustUsefulCurrencyCodes)
    .orWhereIn(`from_currency`, mustUsefulCurrencyCodes)
    .del()

  const lookup: IExchangeRateCreate[] = [
    { fromCurrency: `USD`, toCurrency: `EUR`, rate: 0.95 },
    { fromCurrency: `USD`, toCurrency: `JPY`, rate: 1.0576 },
    { fromCurrency: `USD`, toCurrency: `GBP`, rate: 0.82 },
    { fromCurrency: `USD`, toCurrency: `AUD`, rate: 1.58 },
    { fromCurrency: `EUR`, toCurrency: `USD`, rate: 1.0576 },
    { fromCurrency: `EUR`, toCurrency: `JPY`, rate: 0.8582 },
    { fromCurrency: `EUR`, toCurrency: `GBP`, rate: 0.8427 },
    { fromCurrency: `EUR`, toCurrency: `AUD`, rate: 0.9398 },
    { fromCurrency: `JPY`, toCurrency: `USD`, rate: 149.88 },
    { fromCurrency: `JPY`, toCurrency: `EUR`, rate: 0.0063 },
    { fromCurrency: `JPY`, toCurrency: `GBP`, rate: 0.4798 },
    { fromCurrency: `JPY`, toCurrency: `AUD`, rate: 0.3871 },
    { fromCurrency: `GBP`, toCurrency: `USD`, rate: 1.22 },
    { fromCurrency: `GBP`, toCurrency: `EUR`, rate: 1.15 },
    { fromCurrency: `GBP`, toCurrency: `JPY`, rate: 182.34 },
    { fromCurrency: `GBP`, toCurrency: `AUD`, rate: 0.4087 },
    { fromCurrency: `AUD`, toCurrency: `USD`, rate: 0.63 },
    { fromCurrency: `AUD`, toCurrency: `JPY`, rate: 94.56 },
    { fromCurrency: `AUD`, toCurrency: `EUR`, rate: 0.59 },
    { fromCurrency: `AUD`, toCurrency: `GBP`, rate: 0.52 },
  ]
  for (const exchangeRate of lookup) {
    await knex.insert([exchangeRate]).into(TableName.ExchangeRate).returning(`*`)
    console.count(`[SUCCESS CREATED DUMMY EXCHANGE RATE RECORD]`)
  }

  console.log(`[DONE]`)
}
