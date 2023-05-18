import { Knex } from 'knex'

import { TABLES } from '../models'
import { adminType } from '../shared-types'
import * as utils from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLES.Admins).del()

  const password = `Wirebill@Admin123!`
  const salt = utils.generatePasswordHashSalt(4)
  const hash = utils.generatePasswordHash({ password, salt })
  const data = [
    {
      email: `super.admin@wirebill.com`,
      type: adminType.super,
      salt: salt,
      password: hash,
    },
  ]

  await knex(TABLES.Admins).insert(data)
}
