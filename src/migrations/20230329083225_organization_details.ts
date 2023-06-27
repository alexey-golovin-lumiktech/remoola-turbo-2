import { Knex } from 'knex'

import { TableName } from '../models'
import { OrganizationSize } from '../shared-types'

const tableName = TableName.OrganizationDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)

    table.string(`name`).notNullable()
    table
      .string(`size`)
      .checkIn(Object.values(OrganizationSize), `organization_size_values`)
      .defaultTo(OrganizationSize.Small)
      .notNullable()
    table.string(`consumer_role`).notNullable()

    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
