import { Prisma } from '@remoola/database-2';

import { buildPaymentRequestParticipantIdsSql } from '../../../shared/prisma-raw.utils';

export function buildConsumerDocumentPaymentParticipantWhere(consumerId: string, consumerEmail: string | null) {
  return [
    { requesterId: consumerId },
    { payerId: consumerId },
    ...(consumerEmail
      ? [
          {
            requesterId: null,
            requesterEmail: { equals: consumerEmail, mode: `insensitive` as const },
          },
          {
            payerId: null,
            payerEmail: { equals: consumerEmail, mode: `insensitive` as const },
          },
        ]
      : []),
  ];
}

export function buildConsumerDocumentPaymentParticipantIdsSql(consumerId: string, consumerEmail: string | null) {
  return buildPaymentRequestParticipantIdsSql({
    consumerId,
    consumerEmail: consumerEmail?.trim().toLowerCase() ?? null,
  });
}

export function buildConsumerDocumentKindSql(nameSql: Prisma.Sql) {
  return Prisma.sql`
    CASE
      WHEN LOWER(${nameSql}) LIKE '%w9%' OR LOWER(${nameSql}) LIKE '%w-9%' THEN 'COMPLIANCE'
      WHEN LOWER(${nameSql}) LIKE '%contract%' THEN 'CONTRACT'
      WHEN LOWER(${nameSql}) LIKE '%invoice%' THEN 'PAYMENT'
      ELSE 'GENERAL'
    END
  `;
}
