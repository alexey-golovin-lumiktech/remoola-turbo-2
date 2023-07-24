import { Knex } from 'knex'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.PaymentRequest

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`requester_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).onUpdate(`CASCADE`)
    table.uuid(`payer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).onUpdate(`CASCADE`)

    table.integer(`transaction_amount`).notNullable()
    table
      .string(`transaction_currency_code`)
      .checkIn(Object.values(CurrencyCode), `currency_code_code`)
      .defaultTo(CurrencyCode.USD)
      .notNullable()
    table
      .string(`transaction_status`)
      .checkIn(Object.values(TransactionStatus), `payment_status_values`)
      .defaultTo(TransactionStatus.Draft)
      .notNullable()
    table
      .string(`transaction_type`)
      .checkIn(Object.values(TransactionType), `transaction_type_values`)
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

  return knex.schema.dropTable(tableName)
}
