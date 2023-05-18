import { Knex } from 'knex'

import type { TableName } from '../../models'

export const addNullableRef = (column: string, inTable: TableName) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).nullable().references(`id`).inTable(inTable)
}

export const addNotNullableRef = (column: string, inTable: TableName) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).notNullable().references(`id`).inTable(inTable)
}

export const dropColumn = (column: string) => (t: Knex.AlterTableBuilder) => {
  t.dropColumn(column)
}
