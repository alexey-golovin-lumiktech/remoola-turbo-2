import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.PaymentRequestAttachment

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table
      .uuid(`requester_id`)
      .notNullable()
      .references(`id`)
      .inTable(TableName.Consumer)
      .onDelete(`CASCADE`)
      .comment(`consumer.id (or identity.id)`)

    table.uuid(`payment_request_id`).notNullable().references(`id`).inTable(TableName.PaymentRequest).onDelete(`CASCADE`)
    table.uuid(`resource_id`).notNullable().references(`id`).inTable(TableName.Resource).onDelete(`CASCADE`)

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
