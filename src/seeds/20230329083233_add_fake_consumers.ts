import { Knex } from 'knex'

import { invoiceStatuses, TableName } from 'src/models'
import { generatePasswordHash, generatePasswordHashSalt } from 'src/utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TableName.Invoices).del()
  await knex(TableName.BillingDetails).del()
  await knex(TableName.GoogleProfiles).del()
  await knex(TableName.Consumers).del()

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

  const consumers = await knex(TableName.Consumers).insert(consumersToInsert).returning(`*`)

  const rawBillingDetails = consumers.map(x => {
    const name = `${x.firstName} ${x.lastName}`
    return { email: x.email, consumerId: x.id, name }
  })

  await knex(TableName.BillingDetails).insert(rawBillingDetails).returning(`*`)

  const getRnd = (s: unknown[], creator?: string) => {
    const i = s[Math.round(Math.random() * s.length)]

    if (i) {
      if (creator != undefined && i == creator) getRnd(s, creator)
      else return i
    }
    return getRnd(s, creator)
  }
  const getInvoice = (consumer: any) => () => {
    const filtered = consumers.filter(x => x.email != consumer.email)
    const referer = getRnd(filtered)
    return {
      creatorId: consumer.id,
      refererId: referer.id,
      charges: (Math.random() * 400).toFixed(2),
      tax: (Math.random() * 20).toFixed(2),
      description: `no description`,
      status: getRnd(invoiceStatuses),
    }
  }

  const rawInvoices = consumers.reduce((collector, x) => {
    collector[x.email] = Array(Math.round(Math.random() * 1000))
      .fill(null)
      .map(getInvoice(x))
    return collector
  }, {})

  for (const invoices of Object.values(rawInvoices)) await knex(TableName.Invoices).insert(invoices).returning(`*`)
}
