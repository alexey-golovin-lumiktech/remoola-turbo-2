import { type ConsumerAppScope } from '@remoola/api-types';
import { type Prisma } from '@remoola/database-2';

import { extractConsumerAppScopeFromMetadata } from './payment-link-metadata';
import { type PrismaService } from './prisma.service';

const PAYMENT_LINK_SCOPE_BATCH_SIZE = 100;

type LedgerMetadataReader = Pick<PrismaService, `ledgerEntryModel`>;
type LedgerHistoryCursor = {
  createdAt: Date;
  id: string;
};

export async function resolvePaymentLinkConsumerAppScopeFromLedgerHistory(
  prisma: LedgerMetadataReader,
  paymentRequestId: string,
): Promise<ConsumerAppScope | undefined> {
  let cursor: LedgerHistoryCursor | undefined;

  for (;;) {
    const where: Prisma.LedgerEntryModelWhereInput = {
      paymentRequestId,
      deletedAt: null,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              {
                createdAt: cursor.createdAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const entries = await prisma.ledgerEntryModel.findMany({
      where,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: PAYMENT_LINK_SCOPE_BATCH_SIZE,
      select: { id: true, createdAt: true, metadata: true },
    });

    for (const entry of entries) {
      const consumerAppScope = extractConsumerAppScopeFromMetadata(entry.metadata);
      if (consumerAppScope !== undefined) {
        return consumerAppScope;
      }
    }

    if (entries.length < PAYMENT_LINK_SCOPE_BATCH_SIZE) {
      return undefined;
    }

    const last = entries[entries.length - 1];
    cursor = { createdAt: last.createdAt, id: last.id };
  }
}
