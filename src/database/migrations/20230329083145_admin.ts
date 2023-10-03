import { Knex } from 'knex'

import { AdminType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, constraintsToTableLookup } from './migration-utils'

const tableName = TableName.Admin
const tableConstraints = constraintsToTableLookup[tableName]

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`email`).unique().notNullable()
    table
      .string(`type`)
      .checkIn(tableConstraints.AdminType.values, tableConstraints.AdminType.name)
      .defaultTo(AdminType.Admin)
      .notNullable()
    table.string(`password`).notNullable()
    table.string(`salt`).notNullable()

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
