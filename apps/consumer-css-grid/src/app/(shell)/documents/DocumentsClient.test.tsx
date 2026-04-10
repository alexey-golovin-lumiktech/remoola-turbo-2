/**
 * @jest-environment jsdom
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockedPush = jest.fn();
const mockedRefresh = jest.fn();
const mockedBulkDeleteDocumentsMutation = jest.fn();
const mockedDeleteDocumentMutation = jest.fn();
const mockedUpdateDocumentTagsMutation = jest.fn();

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  useRouter: () => ({
    push: mockedPush,
    refresh: mockedRefresh,
  }),
  usePathname: () => `/documents`,
  useSearchParams: () => new URLSearchParams(`page=1&pageSize=20`),
}));

jest.mock(`../../../lib/consumer-mutations.server`, () => ({
  bulkDeleteDocumentsMutation: mockedBulkDeleteDocumentsMutation,
  deleteDocumentMutation: mockedDeleteDocumentMutation,
  updateDocumentTagsMutation: mockedUpdateDocumentTagsMutation,
}));

jest.mock(`./AttachToPaymentModal`, () => ({
  AttachToPaymentModal: () => React.createElement(`div`, null, `Attach to payment modal`),
}));

jest.mock(`./DocumentPreviewPanel`, () => ({
  DocumentPreviewPanel: () => React.createElement(`div`, null, `Document preview panel`),
}));

async function loadSubject() {
  return (await import(`./DocumentsClient`)).DocumentsClient;
}

let DocumentsClient: Awaited<ReturnType<typeof loadSubject>>;

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ` `).trim() ?? ``;
}

function getLink(container: HTMLElement, label: string) {
  const link = Array.from(container.querySelectorAll(`a`)).find(
    (candidate) => normalizeText(candidate.textContent) === label,
  );
  expect(link).toBeTruthy();
  return link as HTMLAnchorElement;
}

async function renderComponent(element: React.ReactElement) {
  const container = document.createElement(`div`);
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe(`DocumentsClient`, () => {
  beforeAll(async () => {
    DocumentsClient = await loadSubject();
  });

  beforeEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedBulkDeleteDocumentsMutation.mockReset();
    mockedDeleteDocumentMutation.mockReset();
    mockedUpdateDocumentTagsMutation.mockReset();
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    document.body.innerHTML = ``;
  });

  it(`keeps draft and historical payment drilldown contract-aware in contract files mode`, async () => {
    const view = await renderComponent(
      <DocumentsClient
        documents={[
          {
            id: `document-draft-1`,
            name: `draft-invoice.pdf`,
            kind: `PAYMENT`,
            createdAt: `2026-04-01T10:00:00.000Z`,
            size: 2048,
            downloadUrl: `https://example.com/draft-invoice.pdf`,
            tags: [`invoice`],
            isAttachedToDraftPaymentRequest: true,
            attachedDraftPaymentRequestIds: [`payment-draft-1`],
            isAttachedToNonDraftPaymentRequest: false,
            attachedNonDraftPaymentRequestIds: [],
          },
          {
            id: `document-record-1`,
            name: `paid-invoice.pdf`,
            kind: `PAYMENT`,
            createdAt: `2026-04-02T10:00:00.000Z`,
            size: 4096,
            downloadUrl: `https://example.com/paid-invoice.pdf`,
            tags: [`invoice`, `paid`],
            isAttachedToDraftPaymentRequest: false,
            attachedDraftPaymentRequestIds: [],
            isAttachedToNonDraftPaymentRequest: true,
            attachedNonDraftPaymentRequestIds: [`payment-closed-1`],
          },
        ]}
        total={2}
        page={1}
        pageSize={20}
        contractContext={{
          id: `contract-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          returnTo: `/contracts/contract-1?returnTo=%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
          draftPaymentRequestIds: [`payment-draft-1`, `payment-draft-2`],
        }}
      />,
    );

    expect(normalizeText(view.container.textContent)).toContain(`Contract files mode`);
    expect(normalizeText(view.container.textContent)).toContain(`Attached to draft payment request`);
    expect(normalizeText(view.container.textContent)).toContain(`Attached to payment record`);
    expect(getLink(view.container, `Back to contract`).getAttribute(`href`)).toBe(
      `/contracts/contract-1?returnTo=%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    );
    expect(getLink(view.container, `Open draft`).getAttribute(`href`)).toBe(
      `/payments/payment-draft-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    );
    expect(getLink(view.container, `Open payment`).getAttribute(`href`)).toBe(
      `/payments/payment-closed-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting%26page%3D2`,
    );

    await view.unmount();
  });
});
