import { Knex } from 'knex'

import { ResourceAccess } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, constraintsToTableLookup } from './migration-utils'

const tableName = TableName.Resource
const tableConstraints = constraintsToTableLookup[tableName]

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table
      .string(`access`)
      .checkIn(tableConstraints.ResourceAccess.values, tableConstraints.ResourceAccess.name)
      .notNullable()
      .defaultTo(ResourceAccess.Public)
      .comment(`one of ${tableConstraints.ResourceAccess.values}`)

    table.string(`originalname`).notNullable().comment(`file originalname(multer)`)
    table.string(`mimetype`).notNullable().comment(`Value of the 'Content-Type' header for this file.`)
    table.integer(`size`).notNullable().comment(`file size in bytes(multer)`)

    table.string(`bucket`).notNullable().comment(`s3 bucket`)
    table.string(`key`).notNullable().comment(`s3 uploaded resource key`)
    table.string(`download_url`).notNullable().comment(`s3 uploaded object location url`)

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
