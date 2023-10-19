import { Knex } from 'knex'

import { FeesType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, CommonConstraints } from './migration-utils'

const tableName = TableName.Transaction

const addNotNullableFields = (table: Knex.CreateTableBuilder, knex: Knex) => {
  table.uuid(`consumer_id`).references(`id`).inTable(TableName.Consumer).onDelete(`CASCADE`).notNullable()

  table
    .string(`code`, 6)
    .defaultTo(knex.raw(`substr(md5(now()::text), 0, 7)`))
    .comment(`current transaction ID - 6 symbols text auto generated on db layer by default`)
    .notNullable()

  table
    .enum(`type`, CommonConstraints.TransactionType.values, {
      useNative: true,
      enumName: CommonConstraints.TransactionType.name,
      existingType: true,
    })
    .notNullable()

  table.decimal(`origin_amount`, 9, 2).notNullable()

  table
    .enum(`currency_code`, CommonConstraints.CurrencyCode.values, {
      useNative: true,
      enumName: CommonConstraints.CurrencyCode.name,
      existingType: true,
    })
    .notNullable()

  table
    .enum(`action_type`, CommonConstraints.TransactionActionType.values, {
      useNative: true,
      enumName: CommonConstraints.TransactionActionType.name,
      existingType: true,
    })
    .notNullable()

  table
    .enum(`status`, CommonConstraints.TransactionStatus.values, {
      useNative: true,
      enumName: CommonConstraints.TransactionStatus.name,
      existingType: true,
    })
    .notNullable()
}

const addNullableFields = (table: Knex.CreateTableBuilder) => {
  table
    .uuid(`payment_request_id`)
    .references(`id`)
    .inTable(TableName.PaymentRequest)
    .onDelete(`SET NULL`)
    .comment(`nullable - according to exchange-rate-management tasks`)
    .nullable()

  table
    .enum(`fees_type`, CommonConstraints.FeesType.values, {
      useNative: true,
      enumName: CommonConstraints.FeesType.name,
      existingType: true,
    })
    .defaultTo(FeesType.NoFeesIncluded)
    .comment(`nullable - according to exchange-rate-management tasks`)
    .nullable()

  table.decimal(`fees_amount`, 9, 2).comment(`nullable - according to exchange-rate-management tasks`).nullable()

  table.string(`stripe_id`).nullable()

  table.integer(`stripe_fee_in_percents`).checkBetween([0, 100], `transaction_stripe_fee_in_percents_range`).nullable()
}

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  await knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    addNotNullableFields(table, knex)

    addNullableFields(table)

    table.string(`created_by`).notNullable()
    table.string(`updated_by`).notNullable()
    table.string(`deleted_by`)

    table.unique([`payment_request_id`, `code`])
    addAuditColumns(table, knex)
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema //
    .alterTable(tableName, table => {
      table.dropUnique([`payment_request_id`, `code`])
    })
    .finally(() => knex.schema.dropTable(tableName))
}
