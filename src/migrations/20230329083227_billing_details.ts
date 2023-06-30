import { Knex } from 'knex'

import { TableName } from '../models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.BillingDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).onUpdate(`CASCADE`)

    table.string(`email`)
    table.string(`name`)
    table.string(`phone`)

    // address
    table.string(`city`)
    table.string(`country`)
    table.string(`line1`)
    table.string(`line2`)
    table.string(`postal_code`)
    table.string(`state`)

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
