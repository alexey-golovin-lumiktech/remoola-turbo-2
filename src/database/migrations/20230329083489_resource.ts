import { Knex } from 'knex'

import { ResourceAccess } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.Resource

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table
      .enum(`access`, CommonConstraints.ResourceAccess.values, {
        useNative: true,
        enumName: CommonConstraints.ResourceAccess.name,
        existingType: true,
      })
      .notNullable()
      .defaultTo(ResourceAccess.Public)
      .comment(`one of ${CommonConstraints.ResourceAccess.values}`)

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

  return knex.schema.dropTable(tableName)
}
