import { Knex } from 'knex'

import { OrganizationSize } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.OrganizationDetails

const Checks = {
  OrganizationSize: { name: `organization_size_value_constraint`, values: Object.values(OrganizationSize) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)

    table.string(`name`).notNullable()
    table.string(`consumer_role`).notNullable()
    table
      .string(`size`)
      .checkIn(Checks.OrganizationSize.values, Checks.OrganizationSize.name)
      .defaultTo(OrganizationSize.Small)
      .notNullable()

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
