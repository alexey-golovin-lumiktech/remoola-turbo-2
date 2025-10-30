/* eslint-disable max-len */
/* _________________________________________________________________________________________________________________________________________________________________________________________________________
| STATUS        | DESCRIPTION                                                                                           | ACTIONS                                                                          |
|---------------|-------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| draft         | The starting status for all invoices. You can still edit the invoice at this point.                   | You can finalize the invoice to open, or delete it if it’s a one-off.            |
| open          | The invoice has been finalized, and is awaiting customer payment. You can no longer edit the invoice. | Send the invoice. You can also mark the invoice as paid, void or uncollectible.  |
| paid          | This invoice was paid.                                                                                | No actions possible.                                                             |
| void          | This invoice was a mistake, and must be canceled.                                                     | No actions possible.                                                             |
| uncollectible | The customer is unlikely to pay this invoice (treat it as bad debt in your accounting process).       | You can void or pay the invoice.                                                 |
|_______________|_______________________________________________________________________________________________________|_________________________________________________________________________________ */
export const StripeInvoiceStatus = { Draft: `draft`, Open: `open`, Paid: `paid`, Uncollectible: `uncollectible`, Void: `void` } as const

export const SortDirection = { Asc: `asc`, Desc: `desc` } as const
export const SortNulls = { NullsFirst: `NULLS FIRST`, NullsLast: `NULLS LAST` } as const
export const InvoiceType = { Incoming: `incoming-only`, Outgoing: `outgoing-only` } as const
export const AdminType = { Super: `super`, Admin: `admin` } as const
export const AuthHeader = { Bearer: `Bearer`, Basic: `Basic` } as const
export const CredentialsSeparator = { Token: ` `, Credentials: `:` } as const
export const AccountType = { Business: `business`, Contractor: `contractor` } as const
export const ContractorKind = { Entity: `entity`, Individual: `individual` } as const
export const HowDidHearAboutUs = {
  EmployerCompany: `Employer/Company`,
  EmployeeContractor: `Employee/Contractor`,
  ReferredRecommended: `Referred/Recommended`,
  EmailInvite: `Email invite`,
  Google: `Google`,
  Facebook: `Facebook`,
  Twitter: `Twitter`,
  LinkedIn: `LinkedIn`,
  Other: `Other`,
} as const
export const OrganizationSize = { Small: `1-10 team members`, Medium: `11 - 100 team members`, Large: `100+ team members` } as const
export const ConsumerRole = {
  Founder: `Founder`,
  Finance: `Finance`,
  Marketing: `Marketing`,
  CustomerSupport: `Customer support`,
  Sales: `Sales`,
  Legal: `Legal`,
  HumanResource: `Human resource`,
  Operations: `Operations`,
  Compliance: `Compliance`,
  Product: `Product`,
  Engineering: `Engineering`,
  AnalysisData: `Analysis/Data`,
  Other: `Other`,
} as const

export const LegalStatus = {
  Individual: `Individual`,
  IndividualEntrepreneur: `Individual entrepreneur`,
  SoleTrader: `Sole trader`,
} as const

export const TransactionType = {
  CreditCard: `credit card`,
  BankTransfer: `bank transfer`,
  CurrencyExchange: `currency exchange`,
} as const

export const TransactionActionType = {
  income: `income`,
  outcome: `outcome`,
} as const

export const TransactionStatus = {
  Draft: `draft`,
  Waiting: `waiting`,
  WaitingRecipientApproval: `waiting recipient approval`, // pay-to-contact payment requests flow
  Pending: `pending`,
  Completed: `completed`,
  Denied: `denied`,
  Uncollectible: `uncollectible`,
} as const

export const Timeline = {
  Past90Days: `Past 90 Days`,
  Past30Days: `Past 30 Days`,
  Past7Days: `Past 7 Days`,
} as const

export const MustUsefulCurrencyCode = {
  USD: `USD`,
  EUR: `EUR`,
  JPY: `JPY`,
  GBP: `GBP`,
  AUD: `AUD`,
} as const

export const CurrencyCode = {
  ...MustUsefulCurrencyCode,
  AZN: `AZN`,
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
  RUB: `RUB`,
} as const

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

export const StripeEvent = {
  SetupIntentCreated: `setup_intent.created`,
  SetupIntentSucceeded: `setup_intent.succeeded`,
  PaymentIntentCreated: `payment_intent.created`,
  InvoiceCreated: `invoice.created`,
  InvoiceItemUpdated: `invoiceitem.updated`,
  InvoiceItemCreated: `invoiceitem.created`,
  CustomerUpdated: `customer.updated`,
  CustomerCreated: `customer.created`,
  CustomerSubscriptionUpdated: `customer.subscription.updated`,
  PaymentIntentCanceled: `payment_intent.canceled`,
  InvoiceVoided: `invoice.voided`,
  InvoiceUpdated: `invoice.updated`,
  InvoiceFinalized: `invoice.finalized`,
  InvoicePaymentSucceeded: `invoice.payment_succeeded`,
  InvoicePaid: `invoice.paid`,
  PaymentIntentSucceeded: `payment_intent.succeeded`,
  ChargeSucceeded: `charge.succeeded`,
  PaymentMethodAttached: `payment_method.attached`,
  SubscriptionScheduleUpdated: `subscription_schedule.updated`,
  SubscriptionScheduleCreated: `subscription_schedule.created`,
  CustomerSubscriptionCreated: `customer.subscription.created`,
  PriceCreated: `price.created`,
  PlanCreated: `plan.created`,
  ProductCreated: `product.created`,
  CustomerSourceCreated: `customer.source.created`,
  SubscriptionScheduleReleased: `subscription_schedule.released`,
  SubscriptionScheduleCanceled: `subscription_schedule.canceled`,
  CustomerSubscriptionDeleted: `customer.subscription.deleted`,
  InvoicePaymentFailed: `invoice.payment_failed`,
  PaymentIntentPaymentFailed: `payment_intent.payment_failed`,
  ChargeFailed: `charge.failed`,
  SetupIntentSetupFailed: `setup_intent.setup_failed`,
  SetupIntentCanceled: `setup_intent.canceled`,
  QuoteFinalized: `quote.finalized`,
  QuoteCreated: `quote.created`,
  QuoteCanceled: `quote.canceled`,
  QuoteAccepted: `quote.accepted`,
  ProductUpdated: `product.updated`,
  ProductDeleted: `product.deleted`,
  PriceUpdated: `price.updated`,
  PlanUpdated: `plan.updated`,
  PriceDeleted: `price.deleted`,
  PlanDeleted: `plan.deleted`,
  BalanceAvailable: `balance.available`,
  PaymentLinkUpdated: `payment_link.updated`,
  PaymentLinkCreated: `payment_link.created`,
  PaymentIntentAmountCapturableUpdated: `payment_intent.amount_capturable_updated`,
  InvoicePaymentActionRequired: `invoice.payment_action_required`,
  PaymentIntentRequiresAction: `payment_intent.requires_action`,
  IdentityVerificationSessionRedacted: `identity.verification_session.redacted`,
  IdentityVerificationSessionCreated: `identity.verification_session.created`,
  IdentityVerificationSessionCanceled: `identity.verification_session.canceled`,
  CustomerSourceUpdated: `customer.source.updated`,
  CustomerDeleted: `customer.deleted`,
  CheckoutSessionCompleted: `checkout.session.completed`,
  CheckoutSessionAsyncPaymentFailed: `checkout.session.async_payment_failed`,
  PaymentIntentProcessing: `payment_intent.processing`,
  ChargePending: `charge.pending`,
  ChargeRefunded: `charge.refunded`,
  ChargeRefundUpdated: `charge.refund.updated`,
  ChargeDisputeCreated: `charge.dispute.created`,
  ChargeCaptured: `charge.captured`,
} as const

export const PGComparisonOperator = { lt: `<`, gt: `>`, gte: `>=`, lte: `<=`, eq: `=`, neq: `!=` } as const

/* ============================================ TIMELINE FILTER fields ============================================ */
export const PaymentRequestTimelineField = { dueDate: `dueDate`, sentDate: `sentDate`, expectationDate: `expectationDate` } as const
export const PersonalDetailsTimelineField = { dateOfBirth: `dateOfBirth` } as const
export const AuditTimelineField = { createdAt: `createdAt`, updatedAt: `updatedAt`, deletedAt: `deletedAt` } as const
/* ============================================ TIMELINE FILTER fields ============================================ */

export const ResourceAccess = { Public: `public`, Private: `private` } as const
export const FeesType = { FeesIncluded: `fees_included`, NoFeesIncluded: `no_fees_included` } as const
export const PaymentMethodType = { BankAccount: `bank account`, CreditCard: `credit card` } as const
