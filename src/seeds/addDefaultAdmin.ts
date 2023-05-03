import { Knex } from 'knex'
import { adminType } from '../models'
import { generatePasswordHashSalt, generatePasswordHash } from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(`admins`).del()

  const password = `Wirebill@Admin123!`
  const salt = generatePasswordHashSalt(4)
  const hash = generatePasswordHash({ password, salt })
  const data = [
    {
      email: `super.admin@wirebill.com`,
      type: adminType.super,
      salt: salt,
      password: hash
    }
  ]

  await knex(`admins`).insert(data)
}
