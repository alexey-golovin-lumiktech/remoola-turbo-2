import { Knex } from 'knex'

import { CurrencyCode, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { addAuditColumns, addUUIDPrimaryKey, constraintsToTableLookup } from './migration-utils'

const tableName = TableName.Transaction
const tableConstraints = constraintsToTableLookup[tableName]

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  await knex.schema.createTable(tableName, table => {
    addUUIDPrimaryKey(table, knex)

    table.uuid(`payment_request_id`).notNullable().references(`id`).inTable(TableName.PaymentRequest).onDelete(`CASCADE`)
    table.string(`code`, 7).comment(`current transaction ID - 6 symbols text auto generated`)

    table.integer(`origin_amount`).notNullable()
    table
      .string(`currency_code`)
      .checkIn(tableConstraints.CurrencyCode.values, tableConstraints.CurrencyCode.name)
      .defaultTo(CurrencyCode.USD)
      .notNullable()
    table
      .string(`type`)
      .checkIn(tableConstraints.TransactionType.values, tableConstraints.TransactionType.name)
      .defaultTo(TransactionType.CreditCard)
      .notNullable()
    table
      .string(`status`)
      .checkIn(tableConstraints.TransactionStatus.values, tableConstraints.TransactionStatus.name)
      .defaultTo(TransactionStatus.Draft)
      .notNullable()

    table.string(`created_by`).notNullable()
    table.string(`updated_by`).notNullable()
    table.string(`deleted_by`)

    table.integer(`fees_amount`)
    table.string(`fees_type`)
    table.string(`stripe_id`)
    table.integer(`stripe_fee_in_percents`).checkBetween([0, 100])

    addAuditColumns(table, knex)
  })

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_default_random_text()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.code := unique_random(6, '${tableName}', 'code');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER set_default_random_text_trigger
    BEFORE INSERT ON ${tableName}
    FOR EACH ROW
    EXECUTE FUNCTION set_default_random_text();
  `)
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  await knex.raw(`DROP TRIGGER IF EXISTS set_default_random_text_trigger ON ${tableName};`)
  await knex.raw(`DROP FUNCTION IF EXISTS set_default_random_text`)
  const constraintNamesToDrop = Object.values(tableConstraints).map(x => x.name)
  return knex.schema //
    .alterTable(tableName, table => table.dropChecks(constraintNamesToDrop))
    .finally(() => knex.schema.dropTable(tableName))
}
