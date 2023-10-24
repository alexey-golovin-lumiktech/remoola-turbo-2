import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.ExchangeRate

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`from_currency`).checkIn(CommonConstraints.CurrencyCode.values).notNullable()

    table.string(`to_currency`).checkIn(CommonConstraints.CurrencyCode.values).notNullable()

    table.decimal(`rate`, 11, 4).notNullable()

    table.unique([`from_currency`, `to_currency`])
    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
