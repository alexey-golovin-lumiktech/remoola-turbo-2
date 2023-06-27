import moment from 'moment'

export const SortDirection = { Asc: `asc`, Desc: `desc` } as const
export type SortDirectionValue = (typeof SortDirection)[keyof typeof SortDirection]

export const SortNulls = { NullsFirst: `NULLS FIRST`, NullsLast: `NULLS LAST` } as const
export type SortNullsValue = (typeof SortNulls)[keyof typeof SortNulls]

/* _________________________________________________________________________________________________________________________________________________________________________________________________________
| STATUS        | DESCRIPTION                                                                                           | ACTIONS                                                                          |
|---------------|-------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| draft         | The starting status for all invoices. You can still edit the invoice at this point.                   | You can finalize the invoice to open, or delete it if it’s a one-off.            |
| open          | The invoice has been finalized, and is awaiting customer payment. You can no longer edit the invoice. | Send the invoice. You can also mark the invoice as paid, void or uncollectible.  |
| paid          | This invoice was paid.                                                                                | No actions possible.                                                             |
| void          | This invoice was a mistake, and must be canceled.                                                     | No actions possible.                                                             |
| uncollectible | The customer is unlikely to pay this invoice (treat it as bad debt in your accounting process).       | You can void or pay the invoice.                                                 |
|_______________|_______________________________________________________________________________________________________|_________________________________________________________________________________*/

export const StripeInvoiceStatus = { Draft: `draft`, Open: `open`, Paid: `paid`, Uncollectible: `uncollectible`, Void: `void` } as const
export type StripeInvoiceStatusValue = (typeof StripeInvoiceStatus)[keyof typeof StripeInvoiceStatus]

export const InvoiceType = { Incoming: `incoming-only`, Outgoing: `outgoing-only` } as const
export type InvoiceTypeValue = (typeof InvoiceType)[keyof typeof InvoiceType]

export const AdminType = { Super: `super`, Admin: `admin` } as const
export type AdminTypeValue = (typeof AdminType)[keyof typeof AdminType]

export const AuthHeader = { Bearer: `Bearer`, Basic: `Basic` } as const
export type AuthHeaderValue = (typeof AuthHeader)[keyof typeof AuthHeader]

export const CredentialsSeparator = { Token: ` `, Credentials: `:` } as const
export type CredentialsSeparatorValue = (typeof CredentialsSeparator)[keyof typeof CredentialsSeparator]

export const AccountType = { Business: `business`, Contractor: `contractor` } as const
export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType]

export const ContractorKind = { Entity: `entity`, Individual: `individual` } as const
export type ContractorKindValue = (typeof ContractorKind)[keyof typeof ContractorKind]

export const HowDidHearAboutUs = { Google: `google`, Facebook: `facebook`, Internet: `internet` } as const
export type HowDidHearAboutUsValue = (typeof HowDidHearAboutUs)[keyof typeof HowDidHearAboutUs]

export const OrganizationSize = { Small: `small (1-10)`, Medium: `medium (11-100)`, Large: `large (101-500)` } as const
export type OrganizationSizeValue = (typeof OrganizationSize)[keyof typeof OrganizationSize]

export const ConsumerRole = { Manager: `manager`, Worker: `worker`, Owner: `owner`, Other: `other` } as const
export type ConsumerRoleValue = (typeof ConsumerRole)[keyof typeof ConsumerRole]

export const PaymentStatus = {
  Draft: `draft`,
  Waiting: `waiting`,
  Pending: `pending`,
  Completed: `completed`,
  Denied: `denied`,
  Uncollectible: `uncollectible`,
} as const
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const TransactionType = { CreditCard: `credit card`, BankTransfer: `bank transfer` } as const
export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType]

export const Timeline = {
  Past90Days: moment().add(-90, `days`).valueOf(),
  Past30Days: moment().add(-30, `days`).valueOf(),
  Past7Days: moment().add(-7, `days`).valueOf(),
} as const
export type TimelineValue = (typeof Timeline)[keyof typeof Timeline]

export const CurrencyCode = {
  AUD: `AUD`,
  AZN: `AZN`,
  GBP: `GBP`,
  AMD: `AMD`,
  BYN: `BYN`,
  BGN: `BGN`,
  BRL: `BRL`,
  HUF: `HUF`,
  VND: `VND`,
  HKD: `HKD`,
  GEL: `GEL`,
  DKK: `DKK`,
  AED: `AED`,
  USD: `USD`,
  EUR: `EUR`,
  EGP: `EGP`,
  INR: `INR`,
  IDR: `IDR`,
  KZT: `KZT`,
  CAD: `CAD`,
  QAR: `QAR`,
  KGS: `KGS`,
  CNY: `CNY`,
  MDL: `MDL`,
  NZD: `NZD`,
  NOK: `NOK`,
  PLN: `PLN`,
  RON: `RON`,
  XDR: `XDR`,
  SGD: `SGD`,
  TJS: `TJS`,
  THB: `THB`,
  TRY: `TRY`,
  TMT: `TMT`,
  UZS: `UZS`,
  UAH: `UAH`,
  CZK: `CZK`,
  SEK: `SEK`,
  CHF: `CHF`,
  RSD: `RSD`,
  ZAR: `ZAR`,
  KRW: `KRW`,
  JPY: `JPY`,
  RUB: `RUB`,
} as const
export type CurrencyCodeValue = (typeof CurrencyCode)[keyof typeof CurrencyCode]

export const CardBrand = {
  Visa: `visa`,
  MasterCard: `mastercard`,
  Discover: `discover`,
  Amex: `amex`,
  Jcb: `jcb`,
  DinersClub: `dinersclub`,
  Maestro: `maestro`,
  Laser: `laser`,
  UnionPay: `unionpay`,
  Elo: `elo`,
  Hipercard: `hipercard`,
  Dankort: `dankort`,
  VisaelEctron: `visaelectron`,
} as const
export type CardBrandValue = (typeof CardBrand)[keyof typeof CardBrand]
