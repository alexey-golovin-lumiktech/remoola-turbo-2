import { Knex } from 'knex'

import { adminType, TableName } from 'src/models'
import { generatePasswordHash, generatePasswordHashSalt } from 'src/utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TableName.Admins).del()

  const password = `Wirebill@Admin123!`
  const salt = generatePasswordHashSalt(4)
  const hash = generatePasswordHash({ password, salt })
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
