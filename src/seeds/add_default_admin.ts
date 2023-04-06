import { Knex } from 'knex'
import { AdminType } from '../models'
import { genPassSalt, genPass } from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(`admins`).del()

  const password = `Wirebill@Admin123!`
  const salt = genPassSalt(4)
  const hash = genPass({ password, salt })
  const data = [
    {
      email: `super.admin@wirebill.com`,
      type: AdminType.Super,
      salt: salt,
      password: hash
    }
  ]

  await knex(`admins`).insert(data)
}
