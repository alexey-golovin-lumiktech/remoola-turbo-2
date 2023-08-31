import { Knex } from 'knex'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.PaymentRequest

const Checks = {
  CurrencyCode: { name: `payment_request_currency_code_value_constraint`, values: Object.values(CurrencyCode) },
  TransactionStatus: { name: `payment_request_status_value_constraint`, values: Object.values(TransactionStatus) },
  TransactionType: { name: `payment_request_type_value_constraint`, values: Object.values(TransactionType) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`requester_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)
    table.uuid(`payer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)

    table.integer(`amount`).notNullable()
    table.string(`currency_code`).checkIn(Checks.CurrencyCode.values, Checks.CurrencyCode.name).defaultTo(CurrencyCode.USD).notNullable()
    table
      .string(`status`)
      .checkIn(Checks.TransactionStatus.values, Checks.TransactionStatus.name)
      .defaultTo(TransactionStatus.Draft)
      .notNullable()
    table
      .string(`type`)
      .checkIn(Checks.TransactionType.values, Checks.TransactionType.name)
      .defaultTo(TransactionType.CreditCard)
      .notNullable()
    table.text(`description`)

    table.timestamp(`due_date`)
    table.timestamp(`expectation_date`)
    table.timestamp(`sent_date`)

    table.string(`created_by`).notNullable()
    table.string(`updated_by`).notNullable()
    table.string(`deleted_by`)

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
