import { Knex } from 'knex'

import type { TableNameValue } from '../../models'

export const addNullableRef = (column: string, inTable: TableNameValue) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).nullable().references(`id`).inTable(inTable)
}

export const addNotNullableRef = (column: string, inTable: TableNameValue) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).notNullable().references(`id`).inTable(inTable)
}

export const dropColumn = (column: string) => (t: Knex.AlterTableBuilder) => {
  t.dropColumn(column)
}
