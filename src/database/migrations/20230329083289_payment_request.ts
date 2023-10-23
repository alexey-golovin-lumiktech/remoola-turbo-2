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
    table.string(`currency_code`).checkIn(CommonConstraints.CurrencyCode.values).defaultTo(CurrencyCode.USD).notNullable()
    table.string(`status`).checkIn(CommonConstraints.TransactionStatus.values).defaultTo(TransactionStatus.Draft).notNullable()
    table.string(`type`).checkIn(CommonConstraints.TransactionType.values).defaultTo(TransactionType.CreditCard).notNullable()
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
