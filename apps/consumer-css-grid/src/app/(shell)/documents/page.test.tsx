import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as ConsumerApiServer from '../../../lib/consumer-api.server';

type MockDocumentsClientProps = {
  documents: unknown[];
  total: number;
  page: number;
  pageSize: number;
  contractContext?: {
    id: string;
    name: string;
    email: string;
    returnTo: string;
    draftPaymentRequestIds: string[];
  } | null;
};

const mockedGetDocuments = jest.fn<typeof ConsumerApiServer.getDocuments>();
const mockedGetContractDetails = jest.fn<typeof ConsumerApiServer.getContractDetails>();

let capturedDocumentsClientProps: MockDocumentsClientProps | null = null;

jest.mock(`../../../lib/consumer-api.server`, () => ({
  getDocuments: mockedGetDocuments,
  getContractDetails: mockedGetContractDetails,
}));

jest.mock(`./DocumentsClient`, () => ({
  DocumentsClient: (props: MockDocumentsClientProps) => {
    capturedDocumentsClientProps = props;

    return (
      <section>
        <div>{props.contractContext ? `Contract files mode` : `Document library`}</div>
        {props.contractContext ? <a href={props.contractContext.returnTo}>Back to contract</a> : null}
      </section>
    );
  },
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let DocumentsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`DocumentsPage`, () => {
  beforeAll(async () => {
    DocumentsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetDocuments.mockReset();
    mockedGetContractDetails.mockReset();
    capturedDocumentsClientProps = null;
  });

  it(`builds contract mode context with only draft payment ids and preserved safe return path`, async () => {
    mockedGetDocuments.mockResolvedValue({
      items: [
        {
          id: `document-1`,
          name: `invoice.pdf`,
          kind: `PAYMENT`,
          createdAt: `2026-04-01T10:00:00.000Z`,
          size: 2048,
          downloadUrl: `https://example.com/invoice.pdf`,
          mimetype: `application/pdf`,
          tags: [`invoice`],
          isAttachedToDraftPaymentRequest: true,
          attachedDraftPaymentRequestIds: [`payment-draft-1`],
          isAttachedToNonDraftPaymentRequest: false,
          attachedNonDraftPaymentRequestIds: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    mockedGetContractDetails.mockResolvedValue({
      id: `contract-1`,
      name: `Vendor LLC`,
      email: `vendor@example.com`,
      updatedAt: `2026-04-01T10:00:00.000Z`,
      address: null,
      summary: {
        lastStatus: `draft`,
        lastActivity: `2026-04-01T10:00:00.000Z`,
        lastRequestId: `payment-draft-1`,
        documentsCount: 1,
        paymentsCount: 3,
        completedPaymentsCount: 0,
        draftPaymentsCount: 2,
        pendingPaymentsCount: 1,
        waitingPaymentsCount: 0,
      },
      payments: [
        {
          id: `payment-draft-1`,
          amount: `$100.00`,
          status: `draft`,
          createdAt: `2026-04-01T10:00:00.000Z`,
          updatedAt: `2026-04-01T10:00:00.000Z`,
          role: `REQUESTER`,
          paymentRail: null,
        },
        {
          id: `payment-pending-1`,
          amount: `$200.00`,
          status: `pending`,
          createdAt: `2026-04-01T11:00:00.000Z`,
          updatedAt: `2026-04-01T11:00:00.000Z`,
          role: `REQUESTER`,
          paymentRail: null,
        },
        {
          id: `payment-draft-2`,
          amount: `$300.00`,
          status: `DRAFT`,
          createdAt: `2026-04-01T12:00:00.000Z`,
          updatedAt: `2026-04-01T12:00:00.000Z`,
          role: `REQUESTER`,
          paymentRail: null,
        },
      ],
      documents: [],
    });

    const element = await DocumentsPage({
      searchParams: Promise.resolve({
        contactId: `contract-1`,
        returnTo: `/contracts/contract-1`,
      }),
    });
    const html = renderToStaticMarkup(element);

    expect(mockedGetDocuments).toHaveBeenCalledWith(1, 20, undefined, { contactId: `contract-1` });
    expect(mockedGetContractDetails).toHaveBeenCalledWith(`contract-1`);
    expect(html).toContain(`Contract files mode`);
    expect(html).toContain(`Back to contract`);
    expect(capturedDocumentsClientProps).toMatchObject({
      documents: [
        expect.objectContaining({
          id: `document-1`,
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      contractContext: {
        id: `contract-1`,
        name: `Vendor LLC`,
        email: `vendor@example.com`,
        returnTo: `/contracts/contract-1`,
        draftPaymentRequestIds: [`payment-draft-1`, `payment-draft-2`],
      },
    });
  });

  it(`falls back to the contract detail page when returnTo is unsafe`, async () => {
    mockedGetDocuments.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    mockedGetContractDetails.mockResolvedValue({
      id: `contract-1`,
      name: ``,
      email: `vendor@example.com`,
      updatedAt: `2026-04-01T10:00:00.000Z`,
      address: null,
      summary: {
        lastStatus: null,
        lastActivity: null,
        lastRequestId: null,
        documentsCount: 0,
        paymentsCount: 0,
        completedPaymentsCount: 0,
        draftPaymentsCount: 0,
        pendingPaymentsCount: 0,
        waitingPaymentsCount: 0,
      },
      payments: [],
      documents: [],
    });

    const element = await DocumentsPage({
      searchParams: Promise.resolve({
        contactId: `contract-1`,
        returnTo: `https://evil.example/steal`,
      }),
    });

    renderToStaticMarkup(element);

    expect(capturedDocumentsClientProps?.contractContext).toEqual({
      id: `contract-1`,
      name: `vendor@example.com`,
      email: `vendor@example.com`,
      returnTo: `/contracts/contract-1`,
      draftPaymentRequestIds: [],
    });
  });

  it(`falls back to the contract detail page when returnTo stays internal but leaves the contracts workspace`, async () => {
    mockedGetDocuments.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    mockedGetContractDetails.mockResolvedValue({
      id: `contract-1`,
      name: `Vendor LLC`,
      email: `vendor@example.com`,
      updatedAt: `2026-04-01T10:00:00.000Z`,
      address: null,
      summary: {
        lastStatus: `draft`,
        lastActivity: `2026-04-01T10:00:00.000Z`,
        lastRequestId: `payment-draft-1`,
        documentsCount: 0,
        paymentsCount: 1,
        completedPaymentsCount: 0,
        draftPaymentsCount: 1,
        pendingPaymentsCount: 0,
        waitingPaymentsCount: 0,
      },
      payments: [
        {
          id: `payment-draft-1`,
          amount: `$100.00`,
          status: `draft`,
          createdAt: `2026-04-01T10:00:00.000Z`,
          updatedAt: `2026-04-01T10:00:00.000Z`,
          role: `REQUESTER`,
          paymentRail: null,
        },
      ],
      documents: [],
    });

    const element = await DocumentsPage({
      searchParams: Promise.resolve({
        contactId: `contract-1`,
        returnTo: `/payments/payment-draft-1?contractId=contract-1`,
      }),
    });

    renderToStaticMarkup(element);

    expect(capturedDocumentsClientProps?.contractContext).toEqual({
      id: `contract-1`,
      name: `Vendor LLC`,
      email: `vendor@example.com`,
      returnTo: `/contracts/contract-1`,
      draftPaymentRequestIds: [`payment-draft-1`],
    });
  });
});
