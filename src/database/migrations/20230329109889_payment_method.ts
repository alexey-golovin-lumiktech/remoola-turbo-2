import { Knex } from 'knex'

import { PaymentMethodType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.PaymentMethod

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.uuid(`consumer_id`).notNullable().references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`)
    table.uuid(`billing_details_id`).nullable().references(`id`).inTable(TableName.BillingDetails).onDelete(`SET NULL`).defaultTo(null)

    table.boolean(`default_selected`).notNullable().defaultTo(false)
    table.string(`type`).checkIn(CommonConstraints.PaymentMethodType.values).notNullable()
    table.string(`brand`).notNullable()
    table.string(`last4`, 4).notNullable()
    table.integer(`service_fee`).notNullable().defaultTo(0)

    table.string(`exp_month`, 2).nullable().comment(`required for type: ${PaymentMethodType.CreditCard}`)
    table.string(`exp_year`, 4).nullable().comment(`required for type: ${PaymentMethodType.CreditCard}`)

    table.unique([`type`, `last4`, `consumer_id`])
    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
