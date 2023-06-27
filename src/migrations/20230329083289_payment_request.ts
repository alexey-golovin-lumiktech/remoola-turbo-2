import { Knex } from 'knex'

import { TableName } from '../models'
import { PaymentStatus, TransactionType } from '../shared-types'

const tableName = TableName.PaymentRequest

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.uuid(`requester_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).onUpdate(`CASCADE`)
    table.uuid(`payer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).onUpdate(`CASCADE`)

    table.integer(`amount`).notNullable()
    table.timestamp(`due_by`).notNullable()
    table.timestamp(`sent_date`)
    table
      .string(`transaction_type`)
      .checkIn(Object.values(TransactionType), `transaction_type_values`)
      .defaultTo(TransactionType.CreditCard)
    table.string(`tax_id`)
    table.string(`status`).checkIn(Object.values(PaymentStatus), `payment_status_values`).defaultTo(PaymentStatus.Waiting)

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
