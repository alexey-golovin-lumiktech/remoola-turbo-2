import { Knex } from 'knex'

import { AdminType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Admin

const Checks = {
  AdminType: { name: `admin_type_value_constraint`, values: Object.values(AdminType) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`email`).unique().notNullable()
    table.string(`type`).checkIn(Checks.AdminType.values, Checks.AdminType.name).defaultTo(AdminType.Admin).notNullable()
    table.string(`password`).notNullable()
    table.string(`salt`).notNullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  const checkNamesListToDrop = Object.values(Checks).map(x => x.name)
  return knex.schema
    .alterTable(tableName, table => table.dropChecks(checkNamesListToDrop)) //
    .finally(() => knex.schema.dropTable(tableName))
}
