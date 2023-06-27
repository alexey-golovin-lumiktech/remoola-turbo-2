import { Knex } from 'knex'

import { TableName } from '../models'
import * as shared from '../shared-types'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Consumer

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`email`).unique()
    table.boolean(`verified`).defaultTo(false).notNullable()
    table.boolean(`legal_verified`).defaultTo(false).notNullable().comment(`only when user provide docs`)
    table.string(`account_type`).checkIn(Object.values(shared.AccountType), `account_type_values`).defaultTo(shared.AccountType.Contractor)
    table.string(`contractor_kind`).checkIn(Object.values(shared.ContractorKind), `contractor_kind_values`).defaultTo(null).nullable()
    table.string(`how_did_hear_about_us`).defaultTo(shared.HowDidHearAboutUs.Google)

    table.string(`password`)
    table.string(`salt`)
    table.string(`first_name`)
    table.string(`last_name`)
    table.string(`stripe_customer_id`).defaultTo(null).nullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
