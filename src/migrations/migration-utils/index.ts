import { Knex } from 'knex'

import { TableNameValue } from '@wirebill/shared-common/models'

export const addNullableRef = (column: string, inTable: TableNameValue) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).nullable().references(`id`).inTable(inTable)
}

export const addNotNullableRef = (column: string, inTable: TableNameValue) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).notNullable().references(`id`).inTable(inTable)
}

export const addUUIDPrimaryKey = (table, knex) => {
  table.uuid(`id`).primary().defaultTo(knex.raw(`uuid_generate_v4()`))
}

export const addAuditColumns = (table, knex) => {
  table.timestamp(`created_at`).defaultTo(knex.fn.now())
  table.timestamp(`updated_at`).defaultTo(knex.fn.now())
  table.timestamp(`deleted_at`).defaultTo(null).nullable() // @IMPORTANT_NOTE: to soft delete
}

export const buildIndexName = ({ tableName, columns }) => {
  const delimiter = `_`
  const postfix = `index`
  return `${tableName}${delimiter}${columns.join(delimiter)}${delimiter}${postfix}`
}
