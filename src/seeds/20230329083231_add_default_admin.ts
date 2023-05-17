import { Knex } from 'knex'

import { TableName } from 'src/models'
import { adminType } from 'src/shared-types'
import * as utils from 'src/utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TableName.Admins).del()

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

  await knex(TableName.Admins).insert(data)
}
