import { Knex } from 'knex'
import { UserType } from '../models'
import { genPassSalt, genPass } from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(`users`).del()

  const password = `Wirebill@123!`
  const salt = genPassSalt(4)
  const hash = genPass({ password, salt })
  const data = [
    {
      email: `super.admin@wirebill.com`,
      userType: UserType.Super,
      verified: true,
      salt: salt,
      password: hash
    }
  ]

  await knex(`users`).insert(data)
}
