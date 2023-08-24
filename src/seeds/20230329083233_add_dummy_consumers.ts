import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'

export async function seed(knex: Knex): Promise<void> {
  const dummyConsumerEmails = dummyConsumers.map(x => x.email)
  await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails).del()

  for (const dummyConsumerData of dummyConsumers) {
    const { googleProfileDetails, personalDetails, addressDetails, organizationDetails, billingDetails, ...rawConsumer } = dummyConsumerData
    const [consumer] = await knex.insert([rawConsumer]).into(TableName.Consumer).returning(`*`)
    if (googleProfileDetails != null) {
      await knex
        .insert([{ ...googleProfileDetails, metadata: JSON.stringify(googleProfileDetails), consumerId: consumer.id }])
        .into(TableName.GoogleProfileDetails)
        .returning(`*`)
    }
    if (personalDetails != null) {
      await knex
        .insert([{ ...personalDetails, consumerId: consumer.id }])
        .into(TableName.PersonalDetails)
        .returning(`*`)
    }
    if (addressDetails != null) {
      await knex
        .insert([{ ...addressDetails, consumerId: consumer.id }])
        .into(TableName.AddressDetails)
        .returning(`*`)
    }
    if (organizationDetails != null) {
      await knex
        .insert([{ ...organizationDetails, consumerId: consumer.id }])
        .into(TableName.OrganizationDetails)
        .returning(`*`)
    }
    if (billingDetails != null) {
      await knex
        .insert([{ ...billingDetails, consumerId: consumer.id }])
        .into(TableName.BillingDetails)
        .returning(`*`)
    }
    console.count(`[SUCCESS CREATED DUMMY CONSUMER]`)
  }
}
