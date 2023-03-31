import { Knex } from 'knex'
import { IUserCreate } from '../dtos'
import { UserType } from '../models'
import { generatePasswordSalt, hashPassword } from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(`users`).del()

  const password = `Wirebill@123!`
  const salt = generatePasswordSalt(4)
  const hash = hashPassword(password, salt)
  const data: IUserCreate[] = [
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
