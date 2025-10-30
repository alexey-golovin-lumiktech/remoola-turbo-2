/* eslint-disable simple-import-sort/imports */
import type { IBaseModel } from '../models/base.model'
import type { IPaymentRequestModel, IPersonalDetailsModel } from '../models'
import type {
  SortDirection,
  SortNulls,
  StripeInvoiceStatus,
  InvoiceType,
  AdminType,
  AuthHeader,
  CredentialsSeparator,
  AccountType,
  ContractorKind,
  HowDidHearAboutUs,
  OrganizationSize,
  ConsumerRole,
  LegalStatus,
  TransactionStatus,
  TransactionType,
  Timeline,
  CurrencyCode,
  CardBrand,
  StripeEvent,
  PGComparisonOperator,
  PaymentRequestTimelineField,
  PersonalDetailsTimelineField,
  AuditTimelineField,
  ResourceAccess,
  FeesType,
  TransactionActionType,
  PaymentMethodType,
} from '../enums'

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
export type LegalStatusValue = OneOfObjectValues<typeof LegalStatus>
export type TransactionStatusValue = OneOfObjectValues<typeof TransactionStatus>
export type TransactionTypeValue = OneOfObjectValues<typeof TransactionType>
export type TransactionActionTypeValue = OneOfObjectValues<typeof TransactionActionType>
export type TimelineValue = OneOfObjectValues<typeof Timeline>
export type CurrencyCodeValue = OneOfObjectValues<typeof CurrencyCode>
export type CardBrandValue = OneOfObjectValues<typeof CardBrand>
export type StripeEventValue = OneOfObjectValues<typeof StripeEvent>
export type PGComparisonOperatorValue = OneOfObjectValues<typeof PGComparisonOperator>

export type ReqQueryPaging = { limit?: number; offset?: number }
export type ReqQueryFilter<T> = { [P in OneOfObjectKeys<T>]?: T[P] | [PGComparisonOperatorValue, T[P]] | string | symbol | number }
export type ReqQueryComparisonFilter<T> = { field: OneOfObjectKeys<T>; comparison: PGComparisonOperatorValue; value: T[OneOfObjectKeys<T>] }
export type ReqQuerySorting<T> = { field: keyof T; direction: SortDirectionValue; nulls?: SortNullsValue }
export type ReqQuery<T> = {
  paging?: ReqQueryPaging
  filter?: ReqQueryFilter<T>
  sorting?: Array<ReqQuerySorting<T>>
  comparisonFilters?: Array<ReqQueryComparisonFilter<T>>
}
export type KnexCount = { count: number }

export type WithoutDeletedAt<T> = T extends IBaseModel ? Omit<T, `deletedAt`> : T
export type OnlyUpsertFields<T> = T extends IBaseModel & { consumerId?: string } //
  ? Omit<T, `id` | `createdAt` | `updatedAt` | `deletedAt` | `consumerId` | `metadata`>
  : T extends IBaseModel
    ? Omit<T, `id` | `createdAt` | `updatedAt` | `deletedAt` | `metadata`>
    : T

export type NameIdPair = { id: string; name: string }
export type TypedNameIdPair<TId> = { id: TId; name: string }

/* ============================================ TIMELINE FILTER TYPES ============================================ */
export type PaymentRequestTimelineFieldName = OneOfObjectValues<typeof PaymentRequestTimelineField>
export type PersonalDetailsTimelineFieldName = OneOfObjectValues<typeof PersonalDetailsTimelineField>
export type AuditTimelineFieldName = OneOfObjectValues<typeof AuditTimelineField>

export type TimelineFilterField<T> = T extends IPaymentRequestModel
  ? PaymentRequestTimelineFieldName
  : T extends IPersonalDetailsModel
    ? PersonalDetailsTimelineFieldName
    : AuditTimelineFieldName

export type TimelineFilterFieldValue<T> = T extends IPaymentRequestModel
  ? IPaymentRequestModel[TimelineFilterField<IPaymentRequestModel>]
  : T extends IPersonalDetailsModel
    ? IPersonalDetailsModel[TimelineFilterField<IPersonalDetailsModel>]
    : IBaseModel[TimelineFilterField<IBaseModel>]

export type ReqQueryTimelineFilter<T> = {
  field: TimelineFilterField<T | IBaseModel>
  value: TimelineFilterFieldValue<T | IBaseModel>
  comparison: PGComparisonOperatorValue
}
/* ============================================ TIMELINE FILTER TYPES ============================================ */

export type ResourceAccessValue = OneOfObjectValues<typeof ResourceAccess>
export type FeesTypeValue = OneOfObjectValues<typeof FeesType>
export type Prettified<T> = { [K in keyof T]: T[K] } & NonNullable<unknown>
export type IGetConsumerBallanceResult = { currencyCode: CurrencyCodeValue; amount: number }
export type IGetConsumerBallanceParams = { consumerId: string; currencyCode?: CurrencyCodeValue }
export type PaymentMethodTypeValue = OneOfObjectValues<typeof PaymentMethodType>

export type CreditCardExpMonth = `1` | `2` | `3` | `4` | `5` | `6` | `7` | `8` | `9` | `10` | `11` | `12`
export type CreditCardExpYear = `20${`2` | `3` | `4` | `5` | `6` | `7` | `8` | `9`}${`3` | `4` | `5` | `6` | `7` | `8` | `9`}`
