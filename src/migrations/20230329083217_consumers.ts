import { Knex } from 'knex'

import { TABLE_NAME } from '../models'
import * as shared from '../shared-types'

const tableName = TABLE_NAME.Consumers

export async function up(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (exist) return

  return knex.schema.createTable(tableName, table => {
    table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
    table.string(`email`).unique()
    table.boolean(`verified`).defaultTo(false)
    table.string(`account_type`).checkIn(shared.accountTypeVariants).defaultTo(shared.accountType.contractor)
    table.string(`contractor_kind`).checkIn(shared.contractorKindVariants).defaultTo(null)
    table.string(`how_did_hear_about_us`).defaultTo(shared.howDidHearAboutUsVariants)

    table.string(`password`)
    table.string(`salt`)
    table.string(`first_name`)
    table.string(`last_name`)
    table.string(`stripe_customer_id`)

    table.timestamp(`created_at`).defaultTo(knex.fn.now())
    table.timestamp(`updated_at`).defaultTo(knex.fn.now())
    table.timestamp(`deleted_at`).defaultTo(null).nullable() // to soft delete
  })
}

export async function down(knex: Knex): Promise<void> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return knex.schema.dropTable(tableName)
}
