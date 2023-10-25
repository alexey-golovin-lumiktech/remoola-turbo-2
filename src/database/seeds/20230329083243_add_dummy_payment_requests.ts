import { Knex } from 'knex'

import { IPaymentRequestCreate, ITransactionCreate } from '@wirebill/shared-common/dtos'
import { MustUsefulCurrencyCode, TransactionActionType, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel, ITransactionModel, TableName } from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'
export const getRandomArrayItem = (arr: unknown[]) => arr[Math.round(Math.random() * arr.length)] ?? getRandomArrayItem(arr)

const dummyConsumerEmails = dummyConsumers.map(x => x.email)
const dummyAdminEmails = [`regular.admin@wirebill.com`, `super.admin@wirebill.com`]

const replenishCustomerBallanceThroughTransactions = async (knex: Knex) => {
  const consumers: Awaited<IConsumerModel[]> = await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails)
  for (const consumer of consumers) {
    for (const currencyCode of Object.values(MustUsefulCurrencyCode)) {
      const adminEmail = getRandomArrayItem(dummyAdminEmails)
      const incomeTransaction = {
        currencyCode: currencyCode,
        type: TransactionType.BankTransfer,
        createdBy: adminEmail,
        updatedBy: adminEmail,
        status: TransactionStatus.Completed,
        originAmount: +parseFloat((Math.random() * 1500).toFixed(2)),
        actionType: TransactionActionType.income,
      } satisfies ITransactionCreate

      const [incomeTransactionCreated]: Awaited<ITransactionModel[]> = await knex
        .insert([{ ...incomeTransaction, consumerId: consumer.id }])
        .into(TableName.Transaction)
        .returning(`*`)

      if (incomeTransactionCreated == null) {
        console.log(`[Something went wrong to create payment request income transaction]`)
        process.exit(1)
      }
    }

    console.count(`[SUCCESS REPLENISHED DUMMY CONSUMER BALLANCE]`)
  }
}

export async function seed(knex: Knex): Promise<void> {
  const descriptions = [`SEO`, `Develop a database structure`, `Develop frontend app`, `Develop backend app`]
  const consumers: Awaited<IConsumerModel[]> = await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails)
  const consumerIds = consumers.map(x => x.id)
  await knex.from(TableName.PaymentRequest).whereIn(`requesterId`, consumerIds).orWhereIn(`payerId`, consumerIds).del()
  await knex.from(TableName.Transaction).whereIn(`consumer_id`, consumerIds).del()
  await replenishCustomerBallanceThroughTransactions(knex)

  const dayInMs = 1000 * 60 * 60 * 24
  for (const { id: requesterId, email: requesterEmail } of consumers) {
    for (const { id: payerId } of consumers) {
      if (requesterId === payerId) continue
      for (const type of Object.values(TransactionType)) {
        for (const paymentStatus of Object.values(TransactionStatus)) {
          for (const currencyCode of Object.values(MustUsefulCurrencyCode)) {
            const paymentRequest: IPaymentRequestCreate = {
              requesterId: requesterId,
              payerId: payerId,
              amount: parseFloat((Math.random() * 9).toFixed(2)),
              currencyCode: currencyCode,
              status: paymentStatus,
              type: type,
              description: getRandomArrayItem(descriptions),
              dueDate: new Date(Date.now() + dayInMs * Math.round(Math.random() * 29)),
              sentDate: new Date(Date.now() - dayInMs * Math.round(Math.random() * 21)),
              expectationDate: new Date(Date.now() - dayInMs * Math.round(Math.random() * 37)),
              createdBy: requesterEmail,
              updatedBy: requesterEmail,
            }

            const [paymentRequestCreated]: Awaited<IPaymentRequestModel[]> = await knex
              .insert([paymentRequest])
              .into(TableName.PaymentRequest)
              .returning(`*`)

            if (paymentRequestCreated == null) {
              console.log(`[Something went wrong to create payment request]`)

              process.exit(1)
            }

            if (paymentRequestCreated.status == `completed`) {
              const adminEmail = getRandomArrayItem(dummyAdminEmails)
              const incomeTransaction: ITransactionCreate = {
                paymentRequestId: paymentRequestCreated.id,
                currencyCode: currencyCode,
                type: paymentRequestCreated.type,
                status: paymentRequestCreated.status,

                createdBy: adminEmail,
                updatedBy: adminEmail,
                originAmount: +paymentRequestCreated.amount,
                actionType: TransactionActionType.income,
              } satisfies ITransactionCreate

              const [incomeTransactionCreated]: Awaited<ITransactionModel[]> = await knex
                .insert([{ ...incomeTransaction, consumerId: requesterId }])
                .into(TableName.Transaction)
                .returning(`*`)

              if (incomeTransactionCreated == null) {
                console.log(`[Something went wrong to create payment request income transaction]`)

                process.exit(1)
              }
            } else {
              const outcomeTransaction = {
                paymentRequestId: paymentRequestCreated.id,
                currencyCode: currencyCode,
                type: paymentRequestCreated.type,
                status: paymentRequestCreated.status,

                createdBy: paymentRequestCreated.createdBy,
                updatedBy: paymentRequestCreated.updatedBy,
                originAmount: -paymentRequestCreated.amount,
                actionType: TransactionActionType.outcome,
              } satisfies ITransactionCreate

              const [outcomeTransactionCreated]: Awaited<ITransactionModel[]> = await knex
                .insert([{ ...outcomeTransaction, consumerId: payerId }])
                .into(TableName.Transaction)
                .returning(`*`)

              if (outcomeTransactionCreated == null) {
                console.log(`[Something went wrong to create payment request outcome transaction]`)
                process.exit(1)
              }
            }
            console.count(`[SUCCESS CREATED DUMMY PAYMENT REQUEST]`)
          }
        }
      }
    }
  }

  console.log(`[DONE]`)
}
