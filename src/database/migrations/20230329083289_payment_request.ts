import { Knex } from 'knex'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, constraintsToTableLookup } from './migration-utils'

const tableName = TableName.PaymentRequest
const tableConstraints = constraintsToTableLookup[tableName]

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`requester_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)
    table.uuid(`payer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)

    table.integer(`amount`).notNullable()
    table
      .string(`currency_code`)
      .checkIn(tableConstraints.CurrencyCode.values, tableConstraints.CurrencyCode.name)
      .defaultTo(CurrencyCode.USD)
      .notNullable()
    table
      .string(`status`)
      .checkIn(tableConstraints.TransactionStatus.values, tableConstraints.TransactionStatus.name)
      .defaultTo(TransactionStatus.Draft)
      .notNullable()
    table
      .string(`type`)
      .checkIn(tableConstraints.TransactionType.values, tableConstraints.TransactionType.name)
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

  const constraintNamesToDrop = Object.values(tableConstraints).map(x => x.name)
  return knex.schema //
    .alterTable(tableName, table => table.dropChecks(constraintNamesToDrop))
    .finally(() => knex.schema.dropTable(tableName))
}
