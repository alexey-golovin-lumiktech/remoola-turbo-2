import { Knex } from 'knex'

import { IPaymentRequestCreate, ITransactionCreate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel, ITransactionModel, TableName } from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'

const descriptions = [`SEO`, `Develop a database structure`, `Develop frontend app`, `Develop backend app`]

const getRandomArrayItem = (arr: unknown[]) => arr[Math.round(Math.random() * arr.length)] ?? getRandomArrayItem(arr)

export async function seed(knex: Knex): Promise<void> {
  const dummyConsumerEmails = dummyConsumers.map(x => x.email)
  const consumers: Awaited<IConsumerModel[]> = await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails)
  const consumerIds = consumers.map(x => x.id)
  await knex.from(TableName.PaymentRequest).whereIn(`requesterId`, consumerIds).orWhereIn(`payerId`, consumerIds).del()

  const dayInMs = 1000 * 60 * 60 * 24
  for (const { id: requesterId, email: requesterEmail } of consumers) {
    for (const { id: payerId, email: payerEmail } of consumers) {
      if (requesterId === payerId) continue
      for (const type of Object.values(TransactionType)) {
        for (const paymentStatus of Object.values(TransactionStatus)) {
          for (const currencyCode of Object.values(CurrencyCode)) {
            const paymentRequest: IPaymentRequestCreate = {
              requesterId: requesterId,
              payerId: payerId,
              amount: Math.round(Math.random() * 999),
              currencyCode: currencyCode,
              status: paymentStatus,
              type: type,
              // transactionId: Math.random().toString(36).slice(2).toUpperCase(), ???
              description: getRandomArrayItem(descriptions),
              dueDate: new Date(Date.now() + dayInMs * Math.round(Math.random() * 29)),
              sentDate: new Date(Date.now() - dayInMs * Math.round(Math.random() * 21)),
              expectationDate: new Date(Date.now() - dayInMs * Math.round(Math.random() * 37)),
              createdBy: paymentStatus == `completed` ? payerEmail : requesterEmail,
              updatedBy: paymentStatus == `completed` ? payerEmail : requesterEmail,
              deletedBy: null,
            }

            const [paymentRequestCreated]: Awaited<IPaymentRequestModel[]> = await knex
              .insert([paymentRequest])
              .into(TableName.PaymentRequest)
              .returning(`*`)

            if (paymentRequestCreated == null) {
              console.log(`[Something went wrong to create payment request]`)
              process.exit(1)
            }

            const transaction: ITransactionCreate = {
              paymentRequestId: paymentRequestCreated.id,
              currencyCode: currencyCode,
              originAmount: paymentRequestCreated.amount,
              type: paymentRequestCreated.type,
              status: paymentRequestCreated.status,
              createdBy: paymentRequestCreated.createdBy,
              updatedBy: paymentRequestCreated.updatedBy,
              deletedBy: paymentRequestCreated.deletedBy,
              feesAmount: Math.ceil((paymentRequestCreated.amount / 100) * 10),
              feesType: `fees_type`, // whats mean ???
              stripeId: null,
              stripeFeeInPercents: null,
            }

            const [transactionCreated]: Awaited<ITransactionModel[]> = await knex
              .insert([transaction])
              .into(TableName.Transaction)
              .returning(`*`)

            if (transactionCreated == null) {
              console.log(`[Something went wrong to create payment request transaction]`)
              process.exit(1)
            }
            console.count(`[SUCCESS CREATED DUMMY PAYMENT REQUEST]`)
          }
        }
      }
    }
  }

  console.log(`[DONE]`)
}
