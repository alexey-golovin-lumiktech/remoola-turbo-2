import { Knex } from 'knex'

import { ResourceAccess } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Resource

const Checks = {
  ResourceAccess: { name: `resource_access_value_constraint`, values: Object.values(ResourceAccess) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table
      .string(`access`)
      .checkIn(Checks.ResourceAccess.values, Checks.ResourceAccess.name)
      .notNullable()
      .defaultTo(ResourceAccess.Public)
      .comment(`one of ${Object.values(ResourceAccess)}`)

    table.string(`originalname`).notNullable().comment(`file originalname(multer)`)
    table.string(`mimetype`).notNullable().comment(`Value of the 'Content-Type' header for this file. Used for the uploading to S3`)
    table.integer(`size`).notNullable().comment(`file size in bytes(multer)`)

    table.string(`bucket`).notNullable().comment(`s3 bucket`)
    table.string(`key`).notNullable().comment(`s3 uploaded resource key`)
    table.string(`download_url`).notNullable().comment(`s3 uploaded object location(url)`)

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
