import { Prisma, $Enums } from '@remoola/database-2';

/** Exclude external card-funded legs and unsettled credits from wallet spendable balance. */
export function buildWalletEligibilityCondition(): Prisma.Sql {
  const railSql = Prisma.sql`COALESCE(NULLIF(le.metadata->>'rail', ''), pr.payment_rail::text, '')`;
  return Prisma.sql`
    AND NOT (
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_PAYMENT}
        AND le.amount < 0
        AND ${railSql} = ${$Enums.PaymentRail.CARD}
      )
      OR
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_PAYMENT}
        AND le.amount > 0
        AND ${railSql} = ${$Enums.PaymentRail.CARD}
        AND COALESCE(latest.status, le.status)::text <> ${$Enums.TransactionStatus.COMPLETED}
      )
      OR
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL}
        AND le.amount > 0
        AND (
          ${railSql} = ${$Enums.PaymentRail.STRIPE_REFUND}
          OR ${railSql} = ${$Enums.PaymentRail.STRIPE_CHARGEBACK}
        )
      )
      OR
      (
        le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT}
        AND le.amount > 0
        AND COALESCE(latest.status, le.status)::text <> ${$Enums.TransactionStatus.COMPLETED}
      )
    )
  `;
}
