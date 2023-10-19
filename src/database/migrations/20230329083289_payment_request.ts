import { Knex } from 'knex'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.PaymentRequest

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`requester_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)
    table.uuid(`payer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).comment(`consumer.id`)

    table.decimal(`amount`, 9, 2).notNullable()
    table
      .enum(`currency_code`, CommonConstraints.CurrencyCode.values, {
        useNative: true,
        enumName: CommonConstraints.CurrencyCode.name,
        existingType: true,
      })
      .defaultTo(CurrencyCode.USD)
      .notNullable()
    table
      .enum(`status`, CommonConstraints.TransactionStatus.values, {
        useNative: true,
        enumName: CommonConstraints.TransactionStatus.name,
        existingType: true,
      })
      .defaultTo(TransactionStatus.Draft)
      .notNullable()
    table
      .enum(`type`, CommonConstraints.TransactionType.values, {
        useNative: true,
        enumName: CommonConstraints.TransactionType.name,
        existingType: true,
      })
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

  return knex.schema.dropTable(tableName)
}
