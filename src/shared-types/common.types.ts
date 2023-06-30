import {
  AccountType,
  AdminType,
  AuthHeader,
  CardBrand,
  ConsumerRole,
  ContractorKind,
  CredentialsSeparator,
  CurrencyCode,
  HowDidHearAboutUs,
  InvoiceType,
  OrganizationSize,
  PaymentStatus,
  SortDirection,
  SortNulls,
  StripeEvent,
  StripeInvoiceStatus,
  Timeline,
  TransactionType,
} from './enum-like'

export type OneOfObjectKeys<T> = keyof T
export type OneOfObjectValues<T> = T[OneOfObjectKeys<T>]

export type SortDirectionValue = OneOfObjectValues<typeof SortDirection>
export type SortNullsValue = OneOfObjectValues<typeof SortNulls>
export type StripeInvoiceStatusValue = OneOfObjectValues<typeof StripeInvoiceStatus>
export type InvoiceTypeValue = OneOfObjectValues<typeof InvoiceType>
export type AdminTypeValue = OneOfObjectValues<typeof AdminType>
export type AuthHeaderValue = OneOfObjectValues<typeof AuthHeader>
export type CredentialsSeparatorValue = OneOfObjectValues<typeof CredentialsSeparator>
export type AccountTypeValue = OneOfObjectValues<typeof AccountType>
export type ContractorKindValue = OneOfObjectValues<typeof ContractorKind>
export type HowDidHearAboutUsValue = OneOfObjectValues<typeof HowDidHearAboutUs>
export type OrganizationSizeValue = OneOfObjectValues<typeof OrganizationSize>
export type ConsumerRoleValue = OneOfObjectValues<typeof ConsumerRole>
export type PaymentStatusValue = OneOfObjectValues<typeof PaymentStatus>
export type TransactionTypeValue = OneOfObjectValues<typeof TransactionType>
export type TimelineValue = OneOfObjectValues<typeof Timeline>
export type CurrencyCodeValue = OneOfObjectValues<typeof CurrencyCode>
export type CardBrandValue = OneOfObjectValues<typeof CardBrand>
export type StripeEventValue = OneOfObjectValues<typeof StripeEvent>

export type ListQueryPaging = {
  limit?: number
  offset?: number
}

export type ListQueryFilter<TModel> = {
  [P in keyof TModel]?: TModel[P] | string | symbol | number
}

export type ListQuerySorting<TModel> = {
  field: keyof TModel
  direction: SortDirectionValue
  nulls?: SortNullsValue
}

export type ListQuery<TModel> = {
  paging?: ListQueryPaging
  filter?: ListQueryFilter<TModel>
  sorting?: ListQuerySorting<TModel>[]
}

export type KnexCount = { count: number }
