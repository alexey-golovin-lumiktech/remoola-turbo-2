import { Knex } from 'knex'

import { AccountType, ContractorKind, HowDidHearAboutUs } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Consumer

const Checks = {
  AccountType: { name: `account_type_value_constraint`, values: Object.values(AccountType) },
  ContractorKind: { name: `contractor_kind_value_constraint`, values: Object.values(ContractorKind) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table
      .string(`account_type`) //
      .checkIn(Checks.AccountType.values, Checks.AccountType.name)
      .defaultTo(null)
      .nullable()
    table.string(`contractor_kind`).checkIn(Checks.ContractorKind.values, Checks.ContractorKind.name).defaultTo(null).nullable()
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

  const checkNamesListToDrop = Object.values(Checks).map(x => x.name)
  return knex.schema
    .alterTable(tableName, table => table.dropChecks(checkNamesListToDrop)) //
    .finally(() => knex.schema.dropTable(tableName))
}
