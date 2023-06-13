import { Knex } from 'knex'

import { TABLE_NAME } from '../models'

const tableName = TABLE_NAME.PersonalDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TABLE_NAME.Consumers)

    table.string(`citizen_of`).notNullable()
    table.string(`country_of_tax_residence`).notNullable()
    table.string(`legal_status`).notNullable()
    table.string(`tax_id`).notNullable()
    table.string(`date_of_birth`).notNullable()
    table.string(`passport_or_id_number`).notNullable()
    table.string(`phone_number`).notNullable()

    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(tableName)
}
