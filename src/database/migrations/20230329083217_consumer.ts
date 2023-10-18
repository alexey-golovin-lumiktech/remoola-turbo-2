import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.Consumer

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

    table
      .enum(`account_type`, CommonConstraints.AccountType.values, {
        useNative: true,
        enumName: CommonConstraints.AccountType.name,
        existingType: true,
      })
      .nullable()
      .defaultTo(null)

    table
      .enum(`contractor_kind`, CommonConstraints.ContractorKind.values, {
        useNative: true,
        enumName: CommonConstraints.ContractorKind.name,
        existingType: true,
      })
      .nullable()
      .defaultTo(null)

    table.string(`how_did_hear_about_us`).nullable().defaultTo(null)
    table.string(`stripe_customer_id`).nullable().defaultTo(null)

    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
