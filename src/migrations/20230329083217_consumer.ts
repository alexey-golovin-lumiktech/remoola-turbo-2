import { Knex } from 'knex'

import { TableName } from '../models'
import { AccountType, ContractorKind, HowDidHearAboutUs } from '../shared-types/enum-like'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Consumer

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`account_type`).checkIn(Object.values(AccountType), `account_type_values`).defaultTo(AccountType.Contractor).notNullable()
    table.string(`contractor_kind`).checkIn(Object.values(ContractorKind), `contractor_kind_values`).defaultTo(null).nullable()
    table.string(`email`).unique().notNullable()
    table.boolean(`verified`).defaultTo(false).notNullable()
    table.boolean(`legal_verified`).defaultTo(false).notNullable().comment(`only when user provide docs`)

    table.string(`how_did_hear_about_us`).defaultTo(HowDidHearAboutUs.Google).notNullable()
    table.string(`password`).notNullable()
    table.string(`salt`).notNullable()
    table.string(`first_name`).notNullable()
    table.string(`last_name`).notNullable()
    table.string(`stripe_customer_id`).defaultTo(null).nullable()

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
