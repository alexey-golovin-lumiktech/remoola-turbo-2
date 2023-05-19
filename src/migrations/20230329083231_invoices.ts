import { Knex } from 'knex'

import { TABLES } from '../models'
import { invoiceStatus, invoiceStatuses } from '../shared-types'

const tableName = TABLES.Invoices

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`creator_id`).notNullable().references(`id`).inTable(TABLES.Consumers)
    table.uuid(`referer_id`).notNullable().references(`id`).inTable(TABLES.Consumers)

    table.decimal(`charges`, 10).notNullable()
    table.decimal(`tax`, 10).notNullable()
    table.string(`description`)
    table.enum(`status`, invoiceStatuses).defaultTo(invoiceStatus.due).notNullable()

    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(tableName)
}
