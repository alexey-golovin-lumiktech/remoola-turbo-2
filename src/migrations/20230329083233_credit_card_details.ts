import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.CreditCard

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)
    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)
    table.uuid(`billing_details_id`).nullable().references(`id`).inTable(TableName.BillingDetails).onDelete(`SET NULL`).defaultTo(null)

    table.string(`brand`).notNullable()
    table.string(`country`).notNullable()
    table.integer(`exp_month`).notNullable()
    table.integer(`exp_year`).notNullable()
    table.string(`last4`).notNullable()

    table.jsonb(`metadata`).comment(`stripe card data json`)
    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
