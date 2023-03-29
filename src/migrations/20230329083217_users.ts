import { Knex } from 'knex'

const tableName = `users`

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, (table) => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))

    table.string(`email`).unique().notNullable()
    table.string(`first_name`).notNullable()
    table.string(`last_name`).notNullable()
    table.string(`middle_name`).notNullable()
    table.enum(`user_type`, [`admin`, `user`]).defaultTo(`user`).notNullable()
    table.boolean(`verified`).defaultTo(false).notNullable()

    table.string(`password`).notNullable()
    table.string(`password_hash`).notNullable()
    table.string(`password_salt`).notNullable()
    table.uuid(`google_profile_id`).notNullable().references(`id`).inTable(`google_profiles`)

    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(tableName)
}
