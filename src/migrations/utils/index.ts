import { Knex } from 'knex'

import { TableName as tableName } from 'src/models'

type TableName = ValueOf<typeof tableName>

export const addNullableRef = (column: string, inTable: TableName) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).nullable().references(`id`).inTable(inTable)
}

export const addNotNullableRef = (column: string, inTable: TableName) => (t: Knex.AlterTableBuilder) => {
  t.uuid(column).notNullable().references(`id`).inTable(inTable)
}

export const dropColumn = (column: string) => (t: Knex.AlterTableBuilder) => {
  t.dropColumn(column)
}
