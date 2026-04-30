import { Prisma } from '@remoola/database-2';

type PaymentRequestRole = `PAYER` | `REQUESTER`;

export function sqlUuid(value: string): Prisma.Sql {
  return Prisma.sql`${value}::uuid`;
}

export function buildPaymentRequestParticipantIdsSql(params: {
  consumerId: string;
  consumerEmail: string | null;
  role?: PaymentRequestRole;
}): Prisma.Sql {
  const { consumerId, consumerEmail, role } = params;
  const consumerIdSql = sqlUuid(consumerId);
  const branches: Prisma.Sql[] = [];

  if (role !== `REQUESTER`) {
    branches.push(Prisma.sql`
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.payer_id = ${consumerIdSql}
    `);
  }

  if (role !== `PAYER`) {
    branches.push(Prisma.sql`
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.requester_id = ${consumerIdSql}
    `);
  }

  if (consumerEmail) {
    if (role !== `REQUESTER`) {
      branches.push(Prisma.sql`
        SELECT pr.id
        FROM payment_request pr
        WHERE pr.deleted_at IS NULL
          AND pr.payer_id IS NULL
          AND LOWER(COALESCE(pr.payer_email, '')) = ${consumerEmail}
      `);
    }

    if (role !== `PAYER`) {
      branches.push(Prisma.sql`
        SELECT pr.id
        FROM payment_request pr
        WHERE pr.deleted_at IS NULL
          AND pr.requester_id IS NULL
          AND LOWER(COALESCE(pr.requester_email, '')) = ${consumerEmail}
      `);
    }
  }

  return branches.length === 1 ? branches[0]! : Prisma.join(branches, ` UNION `);
}
