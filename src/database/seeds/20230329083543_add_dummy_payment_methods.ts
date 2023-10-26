import { Knex } from 'knex'

import { IPaymentMethodBankAccountCreate, IPaymentMethodCreditCardCreate } from '@wirebill/shared-common/dtos'
import { CardBrand } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'
export const getRandomArrayItem = (arr: unknown[]) => arr[Math.round(Math.random() * arr.length)] ?? getRandomArrayItem(arr)

export async function seed(knex: Knex): Promise<void> {
  const dummyConsumerEmails = dummyConsumers.map(x => x.email)
  const consumerIds = await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails).pluck(`id`)
  await knex.from(TableName.PaymentMethod).whereIn(`consumer_id`, consumerIds).del()

  const getLastFour = (collector: number[] = []): string => {
    const rnd = Math.round(Math.random() * 9)
    if (rnd) collector.push(rnd)
    if (collector.length == 4) return collector.join(``)
    return getLastFour(collector)
  }

  const getCreditCard = (_: null, index: number): IPaymentMethodCreditCardCreate => {
    const months = [`1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`]
    const years = [`2023`, `2024`, `2025`, `2026`]
    return {
      type: `credit card`,
      brand: getRandomArrayItem(Object.values(CardBrand)),
      last4: getLastFour(),
      expMonth: getRandomArrayItem(months),
      expYear: getRandomArrayItem(years),
      defaultSelected: index == 0,
    }
  }

  const getBankAccount = (_: null, index: number): IPaymentMethodBankAccountCreate => {
    const banks = [
      `JPMorgan`,
      `Bank of America`,
      `Citibank `,
      `Wells Farg`,
      `U.S. Bank`,
      `Truist Ban`,
      `PNC Bank`,
      `Goldman Sachs`,
      `Capital On`,
      `TD Bank`,
    ]
    return {
      type: `bank account`,
      brand: getRandomArrayItem(banks),
      last4: getLastFour(),
      defaultSelected: index == 4,
    }
  }

  for (const consumerId of consumerIds) {
    const bankAccounts = Array(5).fill(null).map(getBankAccount)

    const creditCards = Array(5).fill(null).map(getCreditCard)

    const list = [...bankAccounts, ...creditCards].map(x => ({ ...x, consumerId }))
    await knex.insert(list).into(TableName.PaymentMethod).returning(`*`)

    console.count(`[SUCCESS CREATED DUMMY PAYMENT METHOD RECORD] size: ${list.length}`)
  }

  console.log(`[DONE]`)
}
