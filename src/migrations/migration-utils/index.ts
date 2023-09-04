import { Knex } from 'knex'

import {
  AccountType,
  AdminType,
  ContractorKind,
  CurrencyCode,
  FeesType,
  LegalStatus,
  OrganizationSize,
  ResourceAccess,
  TransactionStatus,
  TransactionType,
} from '@wirebill/shared-common/enums'
import { TableName, TableNameValue } from '@wirebill/shared-common/models'

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

export const constraintsToTableLookup = {
  [TableName.Admin]: {
    AdminType: { name: `admin_type_value_constraint`, values: Object.values(AdminType) },
  },

  [TableName.Consumer]: {
    AccountType: { name: `consumer_account_type_value_constraint`, values: Object.values(AccountType) },
    ContractorKind: { name: `consumer_contractor_kind_value_constraint`, values: Object.values(ContractorKind) },
  },

  [TableName.PersonalDetails]: {
    LegalStatus: { name: `personal_details_legal_status_value_constraint`, values: Object.values(LegalStatus) },
  },

  [TableName.OrganizationDetails]: {
    OrganizationSize: { name: `organization_details_size_value_constraint`, values: Object.values(OrganizationSize) },
  },

  [TableName.PaymentRequest]: {
    CurrencyCode: { name: `payment_request_currency_code_value_constraint`, values: Object.values(CurrencyCode) },
    TransactionStatus: { name: `payment_request_status_value_constraint`, values: Object.values(TransactionStatus) },
    TransactionType: { name: `payment_request_type_value_constraint`, values: Object.values(TransactionType) },
  },

  [TableName.Resource]: {
    ResourceAccess: { name: `resource_access_value_constraint`, values: Object.values(ResourceAccess) },
  },

  [TableName.Transaction]: {
    CurrencyCode: { name: `transaction_currency_code_value_constraint`, values: Object.values(CurrencyCode) },
    TransactionStatus: { name: `transaction_status_value_constraint`, values: Object.values(TransactionStatus) },
    TransactionType: { name: `transaction_type_value_constraint`, values: Object.values(TransactionType) },
    FeesType: { name: `transaction_fees_type_value`, values: Object.values(FeesType) },
  },
} as const
