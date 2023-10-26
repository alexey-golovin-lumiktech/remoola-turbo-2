import { Knex } from 'knex'

import { IContactCreate } from '@wirebill/shared-common/dtos'
import { TableName } from '@wirebill/shared-common/models'

import { default as dummyConsumers } from './dummy-consumers.json'
export const getRandomArrayItem = (arr: unknown[]) => arr[Math.round(Math.random() * arr.length)] ?? getRandomArrayItem(arr)

export async function seed(knex: Knex): Promise<void> {
  const dummyConsumerEmails = dummyConsumers.map(x => x.email)
  const consumers = await knex.from(TableName.Consumer).whereIn(`email`, dummyConsumerEmails)
  const consumerIds = consumers.map(x => x.id)
  await knex.from(TableName.Contact).whereIn(`email`, dummyConsumerEmails).orWhereIn(`consumerId`, consumerIds).del()

  for (const consumer of consumers) {
    for (const email of dummyConsumerEmails.filter(x => x != consumer.email)) {
      try {
        const contact: IContactCreate = {
          email,
          address: {
            postalCode: `4234234`,
            city: `city`,
            country: getRandomArrayItem([`USA`, `RU`, `GB`]),
            state: `state`,
            street: `street`,
          },
          name: email,
        }
        Object.assign(contact, { consumerId: consumer.id })
        await knex.insert([contact]).into(TableName.Contact).returning(`*`)
        console.count(`[SUCCESS CREATED DUMMY CONSUMER CONTACT]`)
      } catch (error) {
        continue
      }
    }
  }

  console.log(`[DONE]`)
}
