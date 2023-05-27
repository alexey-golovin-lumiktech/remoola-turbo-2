import { Knex } from 'knex'

import * as constants from '../constants'
import { TABLE_NAME } from '../models'
import { invoiceStatus, invoiceStatuses } from '../shared-types'

const tableName = TABLE_NAME.Invoices

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`creator_id`).notNullable().references(`id`).inTable(TABLE_NAME.Consumers)
    table.uuid(`referer_id`).notNullable().references(`id`).inTable(TABLE_NAME.Consumers)
    table.enum(`status`, invoiceStatuses).defaultTo(invoiceStatus.open).notNullable()
    table.string(`currency`, 3).defaultTo(constants.currencyCode.USD)
    table.integer(`subtotal`).notNullable() // in cents
    table.decimal(`tax`, 2, 1).defaultTo(0) // percents for total
    table.decimal(`total`, 10, 2).notNullable() // in cents (subtotal + ((subtotal / 100) * tax))

    // stripe
    table.string(`stripe_invoice_id`)
    table.string(`hosted_invoice_url`)
    table.string(`invoice_pdf`)

    table.jsonb(`metadata`) // full stripe invoice details
    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(tableName)
}
