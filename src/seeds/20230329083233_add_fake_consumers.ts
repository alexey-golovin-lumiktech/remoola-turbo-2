import { Knex } from 'knex'

import { TABLE_NAME } from '../models'
import { generatePasswordHash, generatePasswordHashSalt } from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE_NAME.BillingDetails).del()
  await knex(TABLE_NAME.GoogleProfiles).del()
  await knex(TABLE_NAME.Consumers).del()

  const raw = [
    {
      firstName: `simplelogin`,
      lastName: `newsletter`,
      email: `simplelogin-newsletter.djakm@simplelogin.com`,
      password: `T2?cL6^dF4@o`,
    },
    {
      firstName: `alexey`,
      lastName: `golovin`,
      email: `alexey.golovin@lumiktech.com`,
      password: `Wirebill@Admin123!`,
    },
    {
      firstName: `purelybroom`,
      lastName: `866`,
      email: `purelybroom866@simplelogin.com`,
      password: `E6^gR6?uD7!x`,
    },
  ]

  const consumersToInsert = raw.map(x => {
    const salt = generatePasswordHashSalt(4)
    const hash = generatePasswordHash({ password: x.password, salt })
    return {
      firstName: x.firstName,
      lastName: x.lastName,
      email: x.email,
      password: hash,
      salt: salt,
      verified: true,
    }
  })

  const consumers = await knex(TABLE_NAME.Consumers).insert(consumersToInsert).returning(`*`)

  const rawBillingDetails = consumers.map(x => {
    const name = `${x.firstName} ${x.lastName}`
    return { email: x.email, consumerId: x.id, name }
  })

  await knex(TABLE_NAME.BillingDetails).insert(rawBillingDetails).returning(`*`)
}
