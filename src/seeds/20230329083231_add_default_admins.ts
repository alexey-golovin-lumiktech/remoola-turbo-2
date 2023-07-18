import { Knex } from 'knex'

import { IAdminCreate } from '@wirebill/shared-common/dtos'
import { AdminType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import * as utils from '../utils'

export async function seed(knex: Knex): Promise<void> {
  await knex(TableName.Admin).del()

  const admins: Omit<IAdminCreate, `salt`>[] = [
    { type: AdminType.Admin, email: `regular.admin@wirebill.com`, password: `RegularWirebill@Admin123!` },
    { type: AdminType.Super, email: `super.admin@wirebill.com`, password: `SuperWirebill@Admin123!` },
  ]

  for (const admin of admins) {
    const salt = utils.generatePasswordHashSalt(4)
    const hash = utils.generatePasswordHash({ password: admin.password, salt })
    const data: IAdminCreate[] = [{ email: admin.email, type: admin.type, salt: salt, password: hash }]
    await knex(TableName.Admin).insert(data)
  }
}
