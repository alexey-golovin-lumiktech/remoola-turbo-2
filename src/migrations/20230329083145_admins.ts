import { Knex } from 'knex'

import { adminType, adminTypes, TableName } from '../models'

const tableName = TableName.Admins

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.string(`email`).unique().notNullable()
    table.enum(`type`, adminTypes).defaultTo(adminType.admin).notNullable()
    table.string(`password`).notNullable()
    table.string(`salt`).notNullable()
    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(tableName)
}
