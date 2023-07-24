import { Knex } from 'knex'

import { IPaymentRequestCreate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'

export async function seed(knex: Knex): Promise<void> {
  const dummyConsumerEmails = dummyConsumers.map(x => x.email)
  const consumerIds = await knex.from(TableName.Consumer).where(`email`, `in`, dummyConsumerEmails).pluck(`id`)
  await knex.from(TableName.PaymentRequest).whereIn(`requesterId`, consumerIds).orWhereIn(`payerId`, consumerIds).del().returning(`*`)

  const dayInMs = 1000 * 60 * 60 * 24
  for (const requesterId of consumerIds) {
    for (const payerId of consumerIds) {
      if (requesterId === payerId) continue
      for (const transactionType of Object.values(TransactionType)) {
        for (const paymentStatus of Object.values(TransactionStatus)) {
          for (const currencyCode of Object.values(CurrencyCode)) {
            const paymentRequest: IPaymentRequestCreate = {
              requesterId: requesterId,
              payerId: payerId,
              transactionAmount: Math.round(Math.random() * 999),
              transactionCurrencyCode: currencyCode,
              transactionStatus: paymentStatus,
              transactionType: transactionType,
              transactionId: Math.random().toString(36).slice(2).toUpperCase(),
              dueBy: new Date(Date.now() + dayInMs * Math.round(Math.random() * 29)),
              sentDate: new Date(Date.now() - dayInMs * Math.round(Math.random() * 21)),
            }

            await knex.insert([paymentRequest]).into(TableName.PaymentRequest).returning(`*`)
            console.count(`[SUCCESS CREATED DUMMY PAYMENT REQUEST FOR DUMMY CONSUMERS]`)
          }
        }
      }
    }
  }

  console.log(`[DONE]`)
}
