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

export type SortDirectionValue = Values<typeof SortDirection>
export type SortNullsValue = Values<typeof SortNulls>
export type StripeInvoiceStatusValue = Values<typeof StripeInvoiceStatus>
export type InvoiceTypeValue = Values<typeof InvoiceType>
export type AdminTypeValue = Values<typeof AdminType>
export type AuthHeaderValue = Values<typeof AuthHeader>
export type CredentialsSeparatorValue = Values<typeof CredentialsSeparator>
export type AccountTypeValue = Values<typeof AccountType>
export type ContractorKindValue = Values<typeof ContractorKind>
export type HowDidHearAboutUsValue = Values<typeof HowDidHearAboutUs>
export type OrganizationSizeValue = Values<typeof OrganizationSize>
export type ConsumerRoleValue = Values<typeof ConsumerRole>
export type PaymentStatusValue = Values<typeof PaymentStatus>
export type TransactionTypeValue = Values<typeof TransactionType>
export type TimelineValue = Values<typeof Timeline>
export type CurrencyCodeValue = Values<typeof CurrencyCode>
export type CardBrandValue = Values<typeof CardBrand>
export type StripeEventValue = Values<typeof StripeEvent>

export type ListQueryPaging = { limit?: number; offset?: number }
export type ListQueryFilter<TModel> = { [K in keyof TModel]?: TModel[K] | string | symbol | number }
export type ListQuerySorting<TModel> = { field: keyof TModel; direction: SortDirectionValue; nulls?: SortNullsValue }
export type ListQuery<TModel> = { paging?: ListQueryPaging; sorting?: ListQuerySorting<TModel>[]; filter?: ListQueryFilter<TModel> }

export type KnexCount = { count: number }
export type ObjectKey<TObject> = keyof TObject
