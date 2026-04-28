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

export const StripeInvoiceStatus = {
  Draft: `draft`,
  Open: `open`,
  Paid: `paid`,
  Uncollectible: `uncollectible`,
  Void: `void`,
} as const;

export const SortDirection = { Asc: `asc`, Desc: `desc` } as const;

export const SortNulls = { NullsFirst: `NULLS FIRST`, NullsLast: `NULLS LAST` } as const;

export const InvoiceType = { Incoming: `incoming-only`, Outgoing: `outgoing-only` } as const;

export const CredentialsSeparator = { Token: ` `, Credentials: `:` } as const;

export const Timeline = {
  Past90Days: `Past 90 Days`,
  Past30Days: `Past 30 Days`,
  Past7Days: `Past 7 Days`,
} as const;

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
} as const;

export const PGComparisonOperator = { lt: `<`, gt: `>`, gte: `>=`, lte: `<=`, eq: `=`, neq: `!=` } as const;

/* ============================================ TIMELINE FILTER fields ============================================ */

export const PaymentRequestTimelineField = {
  dueDate: `dueDate`,
  sentDate: `sentDate`,
} as const;

export const PersonalDetailsTimelineField = { dateOfBirth: `dateOfBirth` } as const;

export const AuditTimelineField = { createdAt: `createdAt`, updatedAt: `updatedAt`, deletedAt: `deletedAt` } as const;
/* ============================================ TIMELINE FILTER fields ============================================ */
