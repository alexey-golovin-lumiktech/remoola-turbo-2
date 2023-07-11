import { Knex } from 'knex'

import { AdminType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import * as utils from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TableName.Admin).del()

  const password = `Wirebill@Admin123!`
  const salt = utils.generatePasswordHashSalt(4)
  const hash = utils.generatePasswordHash({ password, salt })
  const data = [{ email: `super.admin@wirebill.com`, type: AdminType.Super, salt: salt, password: hash }]

  await knex(TableName.Admin).insert(data)
}
