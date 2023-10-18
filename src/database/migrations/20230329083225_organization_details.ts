import { Knex } from 'knex'

import { OrganizationSize } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.OrganizationDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`name`).notNullable()
    table.string(`consumer_role`).notNullable()
    table
      .enum(`size`, CommonConstraints.OrganizationSize.values, {
        useNative: true,
        enumName: CommonConstraints.OrganizationSize.name,
        existingType: true,
      })
      .defaultTo(OrganizationSize.Small)
      .notNullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
