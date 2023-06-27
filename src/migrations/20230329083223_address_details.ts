import { Knex } from 'knex'

import { TableName } from '../models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.AddressDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)

    table.string(`street`).notNullable()
    table.string(`city`).notNullable()
    table.string(`region`).notNullable()
    table.string(`zip_or_postal_code`).notNullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
