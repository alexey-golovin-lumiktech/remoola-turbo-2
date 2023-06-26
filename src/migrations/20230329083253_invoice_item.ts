import { Knex } from 'knex'

import { TableName } from '../models'
import { CurrencyCode } from '../shared-types'

const tableName = TableName.InvoiceItem

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`invoice_id`).notNullable().references(`id`).inTable(TableName.Invoice)
    table.string(`description`).notNullable()
    table.string(`currency`, 3).notNullable().defaultTo(CurrencyCode.USD)
    table.decimal(`amount`).notNullable() // price in cents

    table.jsonb(`metadata`) // full stripe item details
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
