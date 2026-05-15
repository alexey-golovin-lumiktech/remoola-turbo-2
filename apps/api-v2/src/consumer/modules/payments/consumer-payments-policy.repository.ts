import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { buildWalletEligibilityCondition } from '../../../shared/balance-calculation.sql';
import { sqlUuid } from '../../../shared/prisma-raw.utils';
import { PrismaService } from '../../../shared/prisma.service';

export type ConsumerPaymentsPolicyReadClient = Pick<Prisma.TransactionClient, `consumerModel` | `$queryRaw`>;

@Injectable()
export class ConsumerPaymentsPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConsumerProfileForVerification(consumerId: string, db?: Pick<ConsumerPaymentsPolicyReadClient, `consumerModel`>) {
    const client = db ?? this.prisma;
    return client.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
  }

  findConsumerVerificationRecord(consumerId: string, db?: Pick<ConsumerPaymentsPolicyReadClient, `consumerModel`>) {
    const client = db ?? this.prisma;
    return client.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        legalVerified: true,
        verificationStatus: true,
      },
    });
  }

  async getTodayOutgoingTotal(
    consumerId: string,
    currencyCode: $Enums.CurrencyCode,
    db?: Pick<ConsumerPaymentsPolicyReadClient, `$queryRaw`>,
  ) {
    const client = db ?? this.prisma;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await client.$queryRaw<Array<{ total: string | null }>>(Prisma.sql`
      SELECT COALESCE(SUM(le.amount), 0) AS total
      FROM ledger_entry le
      LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE le.consumer_id = ${sqlUuid(consumerId)}
        AND le.amount < 0
        AND le.currency_code::text = ${currencyCode}
        AND le.type::text IN (${Prisma.join(
          [$Enums.LedgerEntryType.USER_PAYMENT, $Enums.LedgerEntryType.USER_PAYOUT],
          `, `,
        )})
        AND le.created_at >= ${start}
        AND ((COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.PENDING}
             OR (COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.COMPLETED})
        AND le.deleted_at IS NULL
        ${walletEligibilityCondition}
    `);

    return Math.abs(Number(rows[0]?.total ?? 0));
  }
}
