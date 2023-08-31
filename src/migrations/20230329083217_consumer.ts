import { Knex } from 'knex'

import { AccountType, ContractorKind } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey } from './migration-utils'

const tableName = TableName.Consumer

const Checks = {
  AccountType: { name: `consumer_account_type_value_constraint`, values: Object.values(AccountType) },
  ContractorKind: { name: `consumer_contractor_kind_value_constraint`, values: Object.values(ContractorKind) },
} as const

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.string(`email`).notNullable().unique()
    table.boolean(`verified`).notNullable().defaultTo(false)
    table.boolean(`legal_verified`).notNullable().defaultTo(false).comment(`only when user provide docs`)

    table.string(`password`).nullable().defaultTo(null)
    table.string(`salt`).nullable().defaultTo(null)
    table.string(`first_name`).nullable().defaultTo(null)
    table.string(`last_name`).nullable().defaultTo(null)

    table.string(`account_type`).checkIn(Checks.AccountType.values, Checks.AccountType.name).nullable().defaultTo(null)
    table.string(`contractor_kind`).checkIn(Checks.ContractorKind.values, Checks.ContractorKind.name).nullable().defaultTo(null)
    table.string(`how_did_hear_about_us`).nullable().defaultTo(null)
    table.string(`stripe_customer_id`).nullable().defaultTo(null)

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
