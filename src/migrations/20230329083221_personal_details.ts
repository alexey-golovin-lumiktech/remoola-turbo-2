import { Knex } from 'knex'

import { LegalStatus } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.PersonalDetails

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)

    table.string(`citizen_of`).notNullable()
    table.string(`date_of_birth`).notNullable()
    table.string(`passport_or_id_number`).notNullable()
    table.string(`legal_status`).checkIn(Object.values(LegalStatus), `legal_status_values`).notNullable()

    table.string(`country_of_tax_residence`).defaultTo(null).nullable()
    table.string(`tax_id`).defaultTo(null).nullable()
    table.string(`phone_number`).defaultTo(null).nullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
