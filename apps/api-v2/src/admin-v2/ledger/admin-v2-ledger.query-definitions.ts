import { type $Enums, Prisma } from '@remoola/database-2';

export const ledgerListInclude = Prisma.validator<Prisma.LedgerEntryModelInclude>()({
  consumer: { select: { email: true } },
  paymentRequest: {
    select: {
      paymentRail: true,
      status: true,
      payerId: true,
      requesterId: true,
    },
  },
  outcomes: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 1,
    select: { status: true },
  },
  disputes: {
    select: { id: true },
  },
});

export const ledgerCaseSelect = Prisma.validator<Prisma.LedgerEntryModelSelect>()({
  id: true,
  ledgerId: true,
  type: true,
  currencyCode: true,
  status: true,
  amount: true,
  feesType: true,
  feesAmount: true,
  stripeId: true,
  idempotencyKey: true,
  metadata: true,
  consumerId: true,
  paymentRequestId: true,
  createdAt: true,
  updatedAt: true,
  consumer: {
    select: {
      email: true,
    },
  },
  paymentRequest: {
    select: {
      id: true,
      status: true,
      paymentRail: true,
      payerId: true,
      requesterId: true,
      amount: true,
      currencyCode: true,
      payer: { select: { email: true } },
      requester: { select: { email: true } },
    },
  },
  outcomes: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    select: {
      id: true,
      status: true,
      source: true,
      externalId: true,
      createdAt: true,
    },
  },
  disputes: {
    orderBy: [{ createdAt: `asc` }, { id: `asc` }],
    select: {
      id: true,
      stripeDisputeId: true,
      metadata: true,
      createdAt: true,
    },
  },
});

export const relatedLedgerEntrySelect = Prisma.validator<Prisma.LedgerEntryModelSelect>()({
  id: true,
  ledgerId: true,
  type: true,
  amount: true,
  currencyCode: true,
  status: true,
  createdAt: true,
  outcomes: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 1,
    select: { status: true },
  },
});

export const adminActionAuditContextInclude = Prisma.validator<Prisma.AdminActionAuditLogModelInclude>()({
  admin: {
    select: {
      email: true,
    },
  },
});

export const ledgerDisputeInclude = Prisma.validator<Prisma.LedgerEntryDisputeModelInclude>()({
  ledgerEntry: {
    select: {
      id: true,
      ledgerId: true,
      paymentRequestId: true,
      consumerId: true,
      type: true,
      amount: true,
      currencyCode: true,
      paymentRequest: {
        select: {
          paymentRail: true,
        },
      },
    },
  },
});

export type AdminV2LedgerListItemRecord = Prisma.LedgerEntryModelGetPayload<{
  include: typeof ledgerListInclude;
}>;

export type AdminV2LedgerAuditContextRecord = {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  createdAt: Date;
  admin: { email: string | null } | null;
};

export type AdminV2LedgerCaseEntryRecord = Prisma.LedgerEntryModelGetPayload<{
  select: typeof ledgerCaseSelect;
}>;

export type AdminV2RelatedLedgerEntryRecord = Prisma.LedgerEntryModelGetPayload<{
  select: typeof relatedLedgerEntrySelect;
}>;

export type AdminV2LedgerCaseRecord = {
  entry: AdminV2LedgerCaseEntryRecord;
  relatedEntries: AdminV2RelatedLedgerEntryRecord[];
  auditContext: AdminV2LedgerAuditContextRecord[];
};

export type AdminV2LedgerDisputeRow = {
  id: string;
  stripeDisputeId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  ledgerEntry: {
    id: string;
    ledgerId: string;
    paymentRequestId: string | null;
    consumerId: string;
    type: $Enums.LedgerEntryType;
    amount: Prisma.Decimal;
    currencyCode: $Enums.CurrencyCode;
    paymentRequest: {
      paymentRail: $Enums.PaymentRail | null;
    } | null;
  };
};
