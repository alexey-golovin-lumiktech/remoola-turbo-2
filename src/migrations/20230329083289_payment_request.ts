import { Knex } from 'knex'

import { CurrencyCode, PaymentStatus, TransactionType } from '@wirebill/shared-common/enums'
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

    table.integer(`amount`).notNullable()
    table.string(`currency_code`).checkIn(Object.values(CurrencyCode), `currency_code_code`).defaultTo(CurrencyCode.USD).notNullable()
    table.string(`status`).checkIn(Object.values(PaymentStatus), `payment_status_values`).defaultTo(PaymentStatus.Draft).notNullable()

    table
      .string(`transaction_type`)
      .checkIn(Object.values(TransactionType), `transaction_type_values`)
      .defaultTo(TransactionType.CreditCard)
      .notNullable()

    table.timestamp(`due_by`).notNullable()
    table.timestamp(`sent_date`)
    table.string(`tax_id`)

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
