import { Knex } from 'knex'

import { TableName } from '../models'

const tableName = TableName.Consumer

/* 
  triggers for tables
 - "personal_details"
 - "address_details"
 - "organization_details"
 - "google_profile_details"
 - "billing_details"
reason: to avoid manually set(update) ref tables PK for "consumer" table after inserting new row
*/

const refs = [
  TableName.GoogleProfileDetails,
  TableName.PersonalDetails,
  TableName.AddressDetails,
  TableName.OrganizationDetails,
  TableName.BillingDetails,
].map(inRefTable => {
  const columnName = `${inRefTable}_id` as const
  const trigger = `add_${columnName}_trigger` as const
  return { inRefTable, columnName, trigger } as const
})

export async function up(knex: Knex): Promise<void | void[]> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return Promise.all(
    refs.map(({ columnName, inRefTable, trigger }) => {
      return knex.schema.hasColumn(tableName, columnName).then(existColumn => {
        if (existColumn) return null
        return knex.schema
          .table(tableName, table =>
            table //
              .uuid(columnName)
              .references(`id`)
              .inTable(inRefTable)
              .defaultTo(null)
              .nullable()
              .onDelete(`SET NULL`),
          )
          .then(() => {
            return knex.raw(`
              CREATE OR REPLACE FUNCTION ${trigger}() 
              RETURNS TRIGGER AS $$
                BEGIN
                    UPDATE ${TableName.Consumer} 
                    SET ${columnName} = NEW.id 
                    WHERE ${TableName.Consumer}.id = NEW.consumer_id;
                    RETURN NEW;
                END;
              $$ LANGUAGE plpgsql;
              
              DROP TRIGGER IF EXISTS ${trigger} ON ${inRefTable};
              
              CREATE TRIGGER ${trigger} 
              AFTER INSERT 
              ON ${inRefTable} 
              FOR EACH ROW EXECUTE FUNCTION ${trigger}();
            `)
          })
      })
    }),
  )
}

export async function down(knex: Knex): Promise<void | void[]> {
  const exist = await knex.schema.hasTable(tableName)
  if (!exist) return

  return Promise.all(
    refs.map(({ columnName, trigger, inRefTable }) => {
      return knex.raw(`DROP TRIGGER IF EXISTS ${trigger} ON ${inRefTable};`).then(() => {
        return knex.schema.hasColumn(tableName, columnName).then(existColumn => {
          if (!existColumn) return null
          return knex.schema.table(tableName, table => table.dropColumn(columnName))
        })
      })
    }),
  )
}
