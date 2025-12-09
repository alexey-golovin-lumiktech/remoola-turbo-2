/* eslint-disable prettier/prettier */
import { type $Enums } from '@remoola/database-2';

import type {
  SortDirection,
  SortNulls,
  StripeInvoiceStatus,
  InvoiceType,
  AuthHeader,
  CredentialsSeparator,
  Timeline,
  CardBrand,
  StripeEvent,
  PGComparisonOperator,
  PaymentRequestTimelineField,
  PersonalDetailsTimelineField,
  AuditTimelineField,
} from '../enums';
import type { IPaymentRequestModel, IPersonalDetailsModel } from '../models';
import type { IBaseModel } from '../models/base.model';

export type OneOfObjectKeys<T> = keyof T;
export type OneOfObjectValues<T> = T[OneOfObjectKeys<T>];

export type SortDirectionValue = OneOfObjectValues<typeof SortDirection>;
export type SortNullsValue = OneOfObjectValues<typeof SortNulls>;
export type StripeInvoiceStatusValue = OneOfObjectValues<typeof StripeInvoiceStatus>;
export type InvoiceTypeValue = OneOfObjectValues<typeof InvoiceType>;
export type AuthHeaderValue = OneOfObjectValues<typeof AuthHeader>;
export type CredentialsSeparatorValue = OneOfObjectValues<typeof CredentialsSeparator>;
export type TimelineValue = OneOfObjectValues<typeof Timeline>;
export type CardBrandValue = OneOfObjectValues<typeof CardBrand>;
export type StripeEventValue = OneOfObjectValues<typeof StripeEvent>;
export type PGComparisonOperatorValue = OneOfObjectValues<typeof PGComparisonOperator>;

export type ReqQueryPaging = { limit?: number; offset?: number };
export type ReqQueryFilter<T> = {
  [P in OneOfObjectKeys<T>]?: T[P] | [PGComparisonOperatorValue, T[P]] | string | symbol | number;
};
export type ReqQueryComparisonFilter<T> = {
  field: OneOfObjectKeys<T>;
  comparison: PGComparisonOperatorValue;
  value: T[OneOfObjectKeys<T>];
};
export type ReqQuerySorting<T> = { field: keyof T; direction: SortDirectionValue; nulls?: SortNullsValue };
export type ReqQuery<T> = {
  paging?: ReqQueryPaging;
  filter?: ReqQueryFilter<T>;
  sorting?: Array<ReqQuerySorting<T>>;
  comparisonFilters?: Array<ReqQueryComparisonFilter<T>>;
};
export type KnexCount = { count: number };

export type WithoutDeletedAt<T> = T extends IBaseModel ? Omit<T, `deletedAt`> : T;
export type OnlyUpsertFields<T> = T extends IBaseModel & { consumerId?: string } //
  ? Omit<T, `id` | `createdAt` | `updatedAt` | `deletedAt` | `consumerId` | `metadata`>
  : T extends IBaseModel
  ? Omit<T, `id` | `createdAt` | `updatedAt` | `deletedAt` | `metadata`>
  : T;

export type NameIdPair = { id: string; name: string };
export type TypedNameIdPair<TId> = { id: TId; name: string };

/* ============================================ TIMELINE FILTER TYPES ============================================ */
export type PaymentRequestTimelineFieldName = OneOfObjectValues<typeof PaymentRequestTimelineField>;
export type PersonalDetailsTimelineFieldName = OneOfObjectValues<typeof PersonalDetailsTimelineField>;
export type AuditTimelineFieldName = OneOfObjectValues<typeof AuditTimelineField>;

export type TimelineFilterField<T> = T extends IPaymentRequestModel
  ? PaymentRequestTimelineFieldName
  : T extends IPersonalDetailsModel
  ? PersonalDetailsTimelineFieldName
  : AuditTimelineFieldName;

export type TimelineFilterFieldValue<T> = T extends IPaymentRequestModel
  ? IPaymentRequestModel[TimelineFilterField<IPaymentRequestModel>]
  : T extends IPersonalDetailsModel
  ? IPersonalDetailsModel[TimelineFilterField<IPersonalDetailsModel>]
  : IBaseModel[TimelineFilterField<IBaseModel>];

export type ReqQueryTimelineFilter<T> = {
  field: TimelineFilterField<T | IBaseModel>;
  value: TimelineFilterFieldValue<T | IBaseModel>;
  comparison: PGComparisonOperatorValue;
};
/* ============================================ TIMELINE FILTER TYPES ============================================ */

export type Prettified<T> = { [K in keyof T]: T[K] } & NonNullable<unknown>;
export type IGetConsumerBallanceResult = { currencyCode: $Enums.CurrencyCode; amount: number };
export type IGetConsumerBallanceParams = { consumerId: string; currencyCode?: $Enums.CurrencyCode };

export type CreditCardExpMonth = `1` | `2` | `3` | `4` | `5` | `6` | `7` | `8` | `9` | `10` | `11` | `12`;
export type CreditCardExpYear =
  `20${`2` | `3` | `4` | `5` | `6` | `7` | `8` | `9`}${`3` | `4` | `5` | `6` | `7` | `8` | `9`}`;
