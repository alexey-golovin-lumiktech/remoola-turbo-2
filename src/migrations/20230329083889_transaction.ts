import { Knex } from 'knex'

import { CurrencyCode, FeesType, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, constraintsToTableLookup } from './migration-utils'

const tableName = TableName.Transaction
const tableConstraints = constraintsToTableLookup[tableName]

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
      .string(`currency_code`)
      .checkIn(tableConstraints.CurrencyCode.values, tableConstraints.CurrencyCode.name)
      .defaultTo(CurrencyCode.USD)
      .notNullable()
    table
      .string(`type`)
      .checkIn(tableConstraints.TransactionType.values, tableConstraints.TransactionType.name)
      .defaultTo(TransactionType.CreditCard)
      .notNullable()
    table
      .string(`status`)
      .checkIn(tableConstraints.TransactionStatus.values, tableConstraints.TransactionStatus.name)
      .defaultTo(TransactionStatus.Draft)
      .notNullable()

    table.string(`created_by`).notNullable()
    table.string(`updated_by`).notNullable()
    table.string(`deleted_by`)

    table.integer(`fees_amount`)
    table
      .string(`fees_type`)
      .checkIn(tableConstraints.FeesType.values, tableConstraints.FeesType.name)
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

  const constraintNamesToDrop = Object.values(tableConstraints).map(x => x.name)
  return knex.schema //
    .alterTable(tableName, table => {
      table.dropUnique([`payment_request_id`, `code`])
      table.dropChecks([...constraintNamesToDrop, `transaction_stripe_fee_in_percents_range`])
    })
    .finally(() => knex.schema.dropTable(tableName))
}
