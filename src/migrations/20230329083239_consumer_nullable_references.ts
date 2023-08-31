import { Knex } from 'knex'

import { TableName } from '@wirebill/shared-common/models'

const tableName = TableName.Consumer

const refTables = [
  { refTable: TableName.GoogleProfileDetails, refTableId: `google_profile_details_id` },
  { refTable: TableName.PersonalDetails, refTableId: `personal_details_id` },
  { refTable: TableName.AddressDetails, refTableId: `address_details_id` },
  { refTable: TableName.OrganizationDetails, refTableId: `organization_details_id` },
] as const

export async function up(knex: Knex): Promise<void | void[]> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return Promise.all(
    refTables.map(({ refTable, refTableId }) => {
      return knex.schema.hasColumn(tableName, refTableId).then(existColumn => {
        if (existColumn) return null

        return knex.schema.table(tableName, table =>
          table //
            .uuid(refTableId)
            .nullable()
            .references(`id`)
            .inTable(refTable)
            .defaultTo(null)
            .onDelete(`SET NULL`),
        )
      })
    }),
  )
}

export async function down(knex: Knex): Promise<void | void[]> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return Promise.all(
    refTables.map(({ refTableId }) => {
      return knex.schema.hasColumn(tableName, refTableId).then(existColumn => {
        if (!existColumn) return null
        return knex.schema.table(tableName, table => table.dropColumn(refTableId))
      })
    }),
  )
}
