import { $Enums, type Prisma } from '@remoola/database-2';

type JsonRecord = Record<string, unknown>;

type LedgerMetadata = {
  rail: $Enums.PaymentRail | null;
  paymentMethodId: string | null;
  counterpartyId: string | null;
  from: string | null;
  to: string | null;
};

function asRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  if (typeof value !== `object` || value == null || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function optionalString(value: unknown): string | null {
  return typeof value === `string` && value.trim().length > 0 ? value : null;
}

function optionalPaymentRail(value: unknown): $Enums.PaymentRail | null {
  if (typeof value !== `string`) {
    return null;
  }

  return Object.values($Enums.PaymentRail).includes(value as $Enums.PaymentRail) ? (value as $Enums.PaymentRail) : null;
}

export function parseLedgerMetadata(value: Prisma.JsonValue | null | undefined): LedgerMetadata {
  const record = asRecord(value);

  return {
    rail: optionalPaymentRail(record.rail),
    paymentMethodId: optionalString(record.paymentMethodId),
    counterpartyId: optionalString(record.counterpartyId),
    from: optionalString(record.from),
    to: optionalString(record.to),
  };
}
