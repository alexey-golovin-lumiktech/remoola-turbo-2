import { Knex } from 'knex'

import { IConsumerCreate } from '@wirebill/shared-common/dtos'
import {
  IAddressDetailsModel,
  IGoogleProfileDetailsModel,
  IOrganizationDetailsModel,
  IPersonalDetailsModel,
  TableName,
} from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'

export async function seed(knex: Knex): Promise<void> {
  const dummyConsumerEmails = dummyConsumers.map(x => x.email)
  await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails).del()

  for (const dummyConsumerData of dummyConsumers) {
    const { googleProfileDetails, personalDetails, addressDetails, organizationDetails, billingDetails, ...rawConsumer } = dummyConsumerData
    const consumerData = { ...rawConsumer } as IConsumerCreate
    if (googleProfileDetails != null) {
      const [inserted] = await knex
        .insert([{ ...googleProfileDetails, metadata: JSON.stringify(googleProfileDetails) }])
        .into<IGoogleProfileDetailsModel>(TableName.GoogleProfileDetails)
        .returning(`*`)
      if (inserted == null) console.log(`[LOST GoogleProfileDetails]`), process.exit(1)

      consumerData.googleProfileDetailsId = inserted.id
    }
    if (personalDetails != null) {
      const [inserted] = await knex
        .insert([{ ...personalDetails }])
        .into<IPersonalDetailsModel>(TableName.PersonalDetails)
        .returning(`*`)
      if (inserted == null) console.log(`[LOST PersonalDetails]`), process.exit(1)

      consumerData.personalDetailsId = inserted.id
    }
    if (addressDetails != null) {
      const [inserted] = await knex
        .insert([{ ...addressDetails }])
        .into<IAddressDetailsModel>(TableName.AddressDetails)
        .returning(`*`)
      if (inserted == null) console.log(`[LOST AddressDetails]`), process.exit(1)

      consumerData.addressDetailsId = inserted.id
    }
    if (organizationDetails != null) {
      const [inserted] = await knex
        .insert([{ ...organizationDetails }])
        .into<IOrganizationDetailsModel>(TableName.OrganizationDetails)
        .returning(`*`)
      if (inserted == null) console.log(`[LOST OrganizationDetails]`), process.exit(1)

      consumerData.organizationDetailsId = inserted.id
    }

    const [consumer] = await knex.insert([consumerData]).into(TableName.Consumer).returning(`*`)
    if (consumer == null) console.log(`[LOST Consumer]`), process.exit(1)

    console.count(`[SUCCESS CREATED DUMMY CONSUMER]`)
  }
}
