import { Knex } from 'knex'

import { TableName } from '../models'

const tableName = TableName.Consumer

const refs = [
  { columnName: `google_profile_details_id`, inRefTable: TableName.GoogleProfileDetails }, //
  { columnName: `personal_details_id`, inRefTable: TableName.PersonalDetails },
  { columnName: `address_details_id`, inRefTable: TableName.AddressDetails },
  { columnName: `organization_details_id`, inRefTable: TableName.OrganizationDetails },
]

export async function up(knex: Knex): Promise<void | void[]> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return Promise.all(
    refs.map(({ columnName, inRefTable }) => {
      return knex.schema.hasColumn(tableName, columnName).then(existColumn => {
        if (existColumn) return null
        return knex.schema.table(tableName, table =>
          table //
            .uuid(columnName)
            .references(`id`)
            .inTable(inRefTable)
            .defaultTo(null)
            .nullable()
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
    refs.map(({ columnName }) => {
      return knex.schema.hasColumn(tableName, columnName).then(existColumn => {
        if (!existColumn) return null
        return knex.schema.table(tableName, table => table.dropColumn(columnName))
      })
    }),
  )
}
