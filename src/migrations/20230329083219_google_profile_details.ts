import { Knex } from 'knex'

import { TableName } from '../models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.GoogleProfileDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)

    table.jsonb(`data`).notNullable()
    table.string(`email`)
    table.boolean(`email_verified`)
    table.string(`name`)
    table.string(`given_name`)
    table.string(`family_name`)
    table.string(`picture`)
    table.string(`organization`)

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
