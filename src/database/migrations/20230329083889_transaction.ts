import { Knex } from 'knex'

import { CurrencyCode, FeesType, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.Transaction

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  await knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.uuid(`payment_request_id`).notNullable().references(`id`).inTable(TableName.PaymentRequest).onDelete(`CASCADE`)
    table
      .string(`code`, 6)
      .defaultTo(knex.raw(`substr(md5(now()::text), 0, 7)`))
      .comment(`current transaction ID - 6 symbols text auto generated on db layer by default`)

    table.integer(`origin_amount`).notNullable()

    table
      .enum(`currency_code`, CommonConstraints.CurrencyCode.values, {
        useNative: true,
        enumName: CommonConstraints.CurrencyCode.name,
        existingType: true,
      })
      .defaultTo(CurrencyCode.USD)
      .notNullable()

    table
      .enum(`type`, CommonConstraints.TransactionType.values, {
        useNative: true,
        enumName: CommonConstraints.TransactionType.name,
        existingType: true,
      })
      .defaultTo(TransactionType.CreditCard)
      .notNullable()

    table
      .enum(`status`, CommonConstraints.TransactionStatus.values, {
        useNative: true,
        enumName: CommonConstraints.TransactionStatus.name,
        existingType: true,
      })
      .defaultTo(TransactionStatus.Draft)
      .notNullable()

    table.string(`created_by`).notNullable()
    table.string(`updated_by`).notNullable()
    table.string(`deleted_by`)

    table.integer(`fees_amount`)

    table
      .enum(`fees_type`, CommonConstraints.FeesType.values, {
        useNative: true,
        enumName: CommonConstraints.FeesType.name,
        existingType: true,
      })
      .defaultTo(FeesType.NoFeesIncluded)
      .notNullable()

    table.string(`stripe_id`)
    table.integer(`stripe_fee_in_percents`).checkBetween([0, 100], `transaction_stripe_fee_in_percents_range`)

    table.unique([`payment_request_id`, `code`])
    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema //
    .alterTable(tableName, table => {
      table.dropUnique([`payment_request_id`, `code`])
    })
    .finally(() => knex.schema.dropTable(tableName))
}
