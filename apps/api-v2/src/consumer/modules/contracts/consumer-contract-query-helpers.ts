import { buildPaymentRequestParticipantIdsSql } from '../../../shared/prisma-raw.utils';

function buildConsumerContractPaymentParticipantWhere(consumerId: string, consumerEmail: string | null) {
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

function buildConsumerContractCounterpartyWhere(emails: string[]) {
  return emails.flatMap((email) => [
    { payer: { email: { equals: email, mode: `insensitive` as const } } },
    { requester: { email: { equals: email, mode: `insensitive` as const } } },
    { payerEmail: { equals: email, mode: `insensitive` as const } },
    { requesterEmail: { equals: email, mode: `insensitive` as const } },
  ]);
}

export function buildConsumerContractPaymentsWhere(
  consumerId: string,
  contractEmails: string[],
  consumerEmail: string | null,
) {
  return {
    AND: [
      { deletedAt: null },
      { OR: buildConsumerContractPaymentParticipantWhere(consumerId, consumerEmail) },
      { OR: buildConsumerContractCounterpartyWhere(contractEmails) },
    ],
  };
}

export function buildConsumerContractPaymentParticipantIdsSql(consumerId: string, consumerEmail: string | null) {
  return buildPaymentRequestParticipantIdsSql({
    consumerId,
    consumerEmail: consumerEmail?.trim().toLowerCase() ?? null,
  });
}
