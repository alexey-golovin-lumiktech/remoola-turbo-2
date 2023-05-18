import { Knex } from 'knex'

import { TABLES } from '../models'

const tableName = TABLES.GoogleProfiles

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TABLES.Consumers)

    table.jsonb(`data`).notNullable()
    table.string(`email`)
    table.boolean(`email_verified`)
    table.string(`name`)
    table.string(`given_name`)
    table.string(`family_name`)
    table.string(`picture`)
    table.string(`organization`)

    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(tableName)
}
