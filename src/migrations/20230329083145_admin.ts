import { Knex } from 'knex'

import { AdminType } from '@wirebill/shared-common'

import { TableName } from '../models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Admin

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`email`).unique().notNullable()
    table.string(`type`).checkIn(Object.values(AdminType), `admin_type_values`).defaultTo(AdminType.Admin).notNullable()
    table.string(`password`).notNullable()
    table.string(`salt`).notNullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
