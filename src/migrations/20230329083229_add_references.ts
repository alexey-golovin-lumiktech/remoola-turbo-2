import { Knex } from 'knex'

import { TableName } from '../models'

import * as utils from './utils'

export async function up(knex: Knex): Promise<void> {
  // NULLABLE
  await knex.schema.table(TableName.Consumers, utils.addNullableRef(`google_profile_id`, TableName.GoogleProfiles))
  await knex.schema.table(TableName.Consumers, utils.addNullableRef(`billing_details_id`, TableName.BillingDetails))
  await knex.schema.table(TableName.Consumers, utils.addNullableRef(`address_id`, TableName.Addresses))
  await knex.schema.table(TableName.BillingDetails, utils.addNullableRef(`address_id`, TableName.Addresses))

  // NOT NULLABLE
  await knex.schema.table(TableName.Addresses, utils.addNotNullableRef(`billing_details_id`, TableName.BillingDetails))
  await knex.schema.table(TableName.GoogleProfiles, utils.addNotNullableRef(`consumer_id`, TableName.Consumers))
  await knex.schema.table(TableName.BillingDetails, utils.addNotNullableRef(`consumer_id`, TableName.Consumers))
  await knex.schema.table(TableName.Addresses, utils.addNotNullableRef(`consumer_id`, TableName.Consumers))
}

export async function down(knex: Knex): Promise<void> {
  // NOT NULLABLE
  await knex.schema.table(TableName.Consumers, utils.dropColumn(`google_profile_id`))
  await knex.schema.table(TableName.Consumers, utils.dropColumn(`billing_details_id`))
  await knex.schema.table(TableName.Consumers, utils.dropColumn(`address_id`))
  await knex.schema.table(TableName.BillingDetails, utils.dropColumn(`address_id`))

  // NULLABLE
  await knex.schema.table(TableName.Addresses, utils.dropColumn(`billing_details_id`))
  await knex.schema.table(TableName.GoogleProfiles, utils.dropColumn(`consumer_id`))
  await knex.schema.table(TableName.BillingDetails, utils.dropColumn(`consumer_id`))
  await knex.schema.table(TableName.Addresses, utils.dropColumn(`consumer_id`))
}
