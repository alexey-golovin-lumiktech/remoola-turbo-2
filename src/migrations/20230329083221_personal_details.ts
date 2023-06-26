import { Knex } from 'knex'

import { TableName } from '../models'

const tableName = TableName.PersonalDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)

    table.string(`citizen_of`).notNullable()
    table.string(`date_of_birth`).notNullable()
    table.string(`passport_or_id_number`).notNullable()

    table.string(`country_of_tax_residence`).defaultTo(null).nullable()
    table.string(`legal_status`).defaultTo(null).nullable()
    table.string(`tax_id`).defaultTo(null).nullable()
    table.string(`phone_number`).defaultTo(null).nullable()

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
