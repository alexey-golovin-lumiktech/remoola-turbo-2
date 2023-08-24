import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.AdminResource

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.uuid(`admin_id`).notNullable().references(`id`).inTable(TableName.Admin).onDelete(`CASCADE`)
    table.uuid(`resource_id`).notNullable().references(`id`).inTable(TableName.Resource).onDelete(`CASCADE`)
    table.unique([`admin_id`, `resource_id`])

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
