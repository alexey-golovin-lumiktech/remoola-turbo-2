import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.ExchangeRate

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table
      .enum(`from_currency`, CommonConstraints.CurrencyCode.values, {
        useNative: true,
        enumName: CommonConstraints.CurrencyCode.name,
        existingType: true,
      })
      .notNullable()

    table
      .enum(`to_currency`, CommonConstraints.CurrencyCode.values, {
        useNative: true,
        enumName: CommonConstraints.CurrencyCode.name,
        existingType: true,
      })
      .notNullable()

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
