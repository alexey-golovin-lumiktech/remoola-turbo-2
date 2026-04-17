import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getPaymentOperationsQueue: jest.fn(),
}));

const { getPaymentOperationsQueue: mockedGetPaymentOperationsQueue } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentOperationsQueuePage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 payment operations queue`, () => {
  beforeAll(async () => {
    PaymentOperationsQueuePage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPaymentOperationsQueue.mockReset();
    mockedGetPaymentOperationsQueue.mockResolvedValue({
      generatedAt: `2026-04-17T10:00:00.000Z`,
      posture: {
        kind: `non_sla_follow_up_queue`,
        wording: `Operator follow-up queue`,
      },
      buckets: [
        {
          key: `overdue_requests`,
          label: `Overdue requests`,
          operatorPrompt: `Review overdue payment requests and continue case investigation from the payment detail view.`,
          items: [
            {
              id: `payment-overdue`,
              amount: `10.00`,
              currencyCode: `USD`,
              persistedStatus: `WAITING`,
              effectiveStatus: `WAITING`,
              staleWarning: false,
              paymentRail: `CARD`,
              payer: { id: `consumer-1`, email: `payer@example.com` },
              requester: { id: `consumer-2`, email: `requester@example.com` },
              dueDate: `2026-04-01T00:00:00.000Z`,
              createdAt: `2026-03-20T00:00:00.000Z`,
              updatedAt: `2026-04-10T00:00:00.000Z`,
              attachmentsCount: 1,
              invoiceTaggedAttachmentsCount: 1,
              followUpReason: `Due date passed while payment request remains in an active follow-up status`,
              dataFreshnessClass: `bounded-snapshot`,
            },
          ],
        },
        {
          key: `uncollectible_requests`,
          label: `UNCOLLECTIBLE requests`,
          operatorPrompt: `Review UNCOLLECTIBLE payment requests as a distinct collections outcome before continuing case investigation from the payment detail view.`,
          items: [
            {
              id: `payment-uncollectible`,
              amount: `20.00`,
              currencyCode: `USD`,
              persistedStatus: `UNCOLLECTIBLE`,
              effectiveStatus: `UNCOLLECTIBLE`,
              staleWarning: false,
              paymentRail: `BANK_TRANSFER`,
              payer: { id: null, email: `payer@example.com` },
              requester: { id: null, email: `requester@example.com` },
              dueDate: null,
              createdAt: `2026-03-21T00:00:00.000Z`,
              updatedAt: `2026-04-11T00:00:00.000Z`,
              attachmentsCount: 1,
              invoiceTaggedAttachmentsCount: 1,
              followUpReason: `Payment request is marked UNCOLLECTIBLE and requires collections-focused review`,
              dataFreshnessClass: `bounded-snapshot`,
            },
          ],
        },
        {
          key: `stale_waiting_recipient_approval`,
          label: `Stale WAITING_RECIPIENT_APPROVAL`,
          operatorPrompt: `Review payment requests that remain in WAITING_RECIPIENT_APPROVAL beyond the current follow-up window.`,
          items: [
            {
              id: `payment-stale-approval`,
              amount: `25.00`,
              currencyCode: `USD`,
              persistedStatus: `WAITING_RECIPIENT_APPROVAL`,
              effectiveStatus: `WAITING_RECIPIENT_APPROVAL`,
              staleWarning: false,
              paymentRail: `CARD`,
              payer: { id: null, email: `payer@example.com` },
              requester: { id: null, email: `requester@example.com` },
              dueDate: null,
              createdAt: `2026-03-21T00:00:00.000Z`,
              updatedAt: `2026-04-11T00:00:00.000Z`,
              attachmentsCount: 1,
              invoiceTaggedAttachmentsCount: 1,
              followUpReason: `Payment request remains in WAITING_RECIPIENT_APPROVAL beyond the current follow-up window`,
              dataFreshnessClass: `bounded-snapshot`,
            },
          ],
        },
        {
          key: `inconsistent_status`,
          label: `Inconsistent status cases`,
          operatorPrompt: `Review cases where persisted request status and latest settlement status disagree.`,
          items: [
            {
              id: `payment-inconsistent`,
              amount: `30.00`,
              currencyCode: `USD`,
              persistedStatus: `PENDING`,
              effectiveStatus: `COMPLETED`,
              staleWarning: true,
              paymentRail: `CARD`,
              payer: { id: null, email: `payer@example.com` },
              requester: { id: null, email: `requester@example.com` },
              dueDate: null,
              createdAt: `2026-03-22T00:00:00.000Z`,
              updatedAt: `2026-04-12T00:00:00.000Z`,
              attachmentsCount: 1,
              invoiceTaggedAttachmentsCount: 1,
              followUpReason: `Persisted payment status diverges from the latest settlement status`,
              dataFreshnessClass: `bounded-snapshot`,
            },
          ],
        },
        {
          key: `missing_attachment_or_invoice_linkage`,
          label: `Missing attachment or invoice linkage`,
          operatorPrompt: `Review cases with missing supporting attachment coverage or missing invoice-tagged attachment linkage.`,
          items: [
            {
              id: `payment-missing-linkage`,
              amount: `40.00`,
              currencyCode: `USD`,
              persistedStatus: `WAITING`,
              effectiveStatus: `WAITING`,
              staleWarning: false,
              paymentRail: `CARD`,
              payer: { id: null, email: `payer@example.com` },
              requester: { id: null, email: `requester@example.com` },
              dueDate: null,
              createdAt: `2026-03-23T00:00:00.000Z`,
              updatedAt: `2026-04-13T00:00:00.000Z`,
              attachmentsCount: 0,
              invoiceTaggedAttachmentsCount: 0,
              followUpReason: `Payment request has no supporting attachment`,
              dataFreshnessClass: `bounded-snapshot`,
            },
          ],
        },
      ],
    });
  });

  it(`renders the canonical MVP-2 queue buckets without surrogate naming`, async () => {
    const markup = renderToStaticMarkup(await PaymentOperationsQueuePage());

    expect(mockedGetPaymentOperationsQueue).toHaveBeenCalledTimes(1);
    expect(markup).toContain(`Payment operations queue`);
    expect(markup).toContain(`Overdue requests`);
    expect(markup).toContain(`UNCOLLECTIBLE requests`);
    expect(markup).toContain(`Stale WAITING_RECIPIENT_APPROVAL`);
    expect(markup).toContain(`Inconsistent status cases`);
    expect(markup).toContain(`Missing attachment or invoice linkage`);
    expect(markup).toContain(`href="/payments/payment-overdue"`);
    expect(markup).toContain(`href="/consumers/consumer-1"`);
    expect(markup).toContain(`Persisted: PENDING · Effective: COMPLETED`);
    expect(markup).not.toContain(`Denied requests needing review`);
    expect(markup).not.toContain(`Missing attachment follow-up`);
  });
});
