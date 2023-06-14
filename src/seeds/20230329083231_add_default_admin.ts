import { Knex } from 'knex'

import { TABLE_NAME } from '../models'
import { adminType } from '../shared-types'
import * as utils from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE_NAME.Admin).del()

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

  await knex(TABLE_NAME.Admin).insert(data)
}
