import { Knex } from 'knex'

import { TABLE_NAME } from '../models'

const tableName = TABLE_NAME.BillingDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TABLE_NAME.Consumers).onDelete(`CASCADE`).onUpdate(`CASCADE`)

    table.string(`email`)
    table.string(`name`)
    table.string(`phone`)

    // address
    table.string(`city`)
    table.string(`country`)
    table.string(`line1`)
    table.string(`line2`)
    table.string(`postal_code`)
    table.string(`state`)

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
