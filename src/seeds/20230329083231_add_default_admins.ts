import { Knex } from 'knex'

import { IAdminCreate } from '@wirebill/shared-common/dtos'
import { AdminType } from '@wirebill/shared-common/enums'
import { TableName } from '@wirebill/shared-common/models'

import { commonUtils } from '../common-utils'

export async function seed(knex: Knex): Promise<void> {
  const admins: Omit<IAdminCreate, `salt`>[] = [
    { type: AdminType.Admin, email: `regular.admin@wirebill.com`, password: `RegularWirebill@Admin123!` },
    { type: AdminType.Super, email: `super.admin@wirebill.com`, password: `SuperWirebill@Admin123!` },
  ]

  const emails = admins.map(x => x.email)
  await knex.from(TableName.Admin).whereIn(`email`, emails).del()

  for (const admin of admins) {
    const salt = commonUtils.getHashingSalt(4)
    const hash = commonUtils.hashPassword({ password: admin.password, salt })
    const data: IAdminCreate[] = [{ email: admin.email, type: admin.type, salt: salt, password: hash }]
    await knex.insert(data).into(TableName.Admin).returning(`*`)
  }
}
