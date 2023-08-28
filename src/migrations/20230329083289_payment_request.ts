import { Knex } from 'knex'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.PaymentRequest

const Checks = {
  CurrencyCode: { name: `currency_code_value_constraint`, values: Object.values(CurrencyCode) },
  TransactionStatus: { name: `payment_status_value_constraint`, values: Object.values(TransactionStatus) },
  TransactionType: { name: `transaction_type_value_constraint`, values: Object.values(TransactionType) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`requester_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)
    table.uuid(`payer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)

    table.integer(`transaction_amount`).notNullable()
    table
      .string(`transaction_currency_code`)
      .checkIn(Checks.CurrencyCode.values, Checks.CurrencyCode.name)
      .defaultTo(CurrencyCode.USD)
      .notNullable()
    table
      .string(`transaction_status`)
      .checkIn(Checks.TransactionStatus.values, Checks.TransactionStatus.name)
      .defaultTo(TransactionStatus.Draft)
      .notNullable()
    table
      .string(`transaction_type`)
      .checkIn(Checks.TransactionType.values, Checks.TransactionType.name)
      .defaultTo(TransactionType.CreditCard)
      .notNullable()
    table.string(`transaction_id`)
    table.decimal(`stripe_fee_in_percents`, 2, 1)
    table.text(`description`)

    table.timestamp(`due_by`).notNullable()
    table.timestamp(`sent_date`)
    table.timestamp(`paid_on`)

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  const checkNamesListToDrop = Object.values(Checks).map(x => x.name)
  return knex.schema
    .alterTable(tableName, table => table.dropChecks(checkNamesListToDrop)) //
    .finally(() => knex.schema.dropTable(tableName))
}
