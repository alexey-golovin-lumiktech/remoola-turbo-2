import { Knex } from 'knex'

import {
  AccountType,
  AdminType,
  ContractorKind,
  CurrencyCode,
  FeesType,
  LegalStatus,
  OrganizationSize,
  PaymentMethodType,
  ResourceAccess,
  TransactionActionType,
  TransactionStatus,
  TransactionType,
} from '@wirebill/shared-common/enums'
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

export const CommonConstraints = {
  CurrencyCode: { name: `currency_code_value_constraint`, values: Object.values(CurrencyCode) },
  TransactionStatus: { name: `transaction_status_value_constraint`, values: Object.values(TransactionStatus) },
  TransactionType: { name: `transaction_type_value_constraint`, values: Object.values(TransactionType) },
  FeesType: { name: `fees_type_value_constraint`, values: Object.values(FeesType) },
  ResourceAccess: { name: `resource_access_value_constraint`, values: Object.values(ResourceAccess) },
  OrganizationSize: { name: `organization_size_value_constraint`, values: Object.values(OrganizationSize) },
  LegalStatus: { name: `legal_status_value_constraint`, values: Object.values(LegalStatus) },
  AccountType: { name: `account_type_value_constraint`, values: Object.values(AccountType) },
  ContractorKind: { name: `contractor_kind_value_constraint`, values: Object.values(ContractorKind) },
  AdminType: { name: `admin_type_value_constraint`, values: Object.values(AdminType) },
  TransactionActionType: { name: `transaction_action_type_value_constraint`, values: Object.values(TransactionActionType) },
  PaymentMethodType: { name: `payment_method_type_value_constraint`, values: Object.values(PaymentMethodType) },
} as const
