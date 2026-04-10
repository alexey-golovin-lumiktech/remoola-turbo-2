/**
 * @jest-environment jsdom
 */

import { TextDecoder, TextEncoder } from 'util';

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { type PaymentFlowContext } from '../payments/payment-flow-context';

import type * as ConsumerMutationsServer from '../../../lib/consumer-mutations.server';

const mockedCreatePaymentCheckoutSessionMutation =
  jest.fn<typeof ConsumerMutationsServer.createPaymentCheckoutSessionMutation>();
const mockedGenerateInvoiceMutation = jest.fn<typeof ConsumerMutationsServer.generateInvoiceMutation>();
const mockedSendPaymentRequestMutation = jest.fn<typeof ConsumerMutationsServer.sendPaymentRequestMutation>();

async function loadContractInlineActionsClient() {
  return (await import(`./ContractInlineActionsClient`)).ContractInlineActionsClient;
}

let ContractInlineActionsClient: Awaited<ReturnType<typeof loadContractInlineActionsClient>>;

if (typeof globalThis.TextEncoder === `undefined`) {
  Object.assign(globalThis, { TextEncoder });
}

if (typeof globalThis.TextDecoder === `undefined`) {
  Object.assign(globalThis, { TextDecoder });
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/consumer-mutations.server`, () => ({
  createPaymentCheckoutSessionMutation: mockedCreatePaymentCheckoutSessionMutation,
  generateInvoiceMutation: mockedGenerateInvoiceMutation,
  sendPaymentRequestMutation: mockedSendPaymentRequestMutation,
}));

jest.mock(`next/cache`, () => ({
  revalidatePath: jest.fn(),
}));

jest.mock(`next/headers`, () => ({
  cookies: jest.fn(async () => ({
    toString: (): string => `consumer_session=test-cookie`,
  })),
}));

beforeAll(async () => {
  ContractInlineActionsClient = await loadContractInlineActionsClient();
});

const paymentFlowContext: PaymentFlowContext = {
  contractId: `contract-1`,
  returnTo: `/contracts/contract-1`,
};

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ` `).trim() ?? ``;
}

function getButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll(`button`)).find(
    (candidate) => normalizeText(candidate.textContent) === label,
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function queryButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll(`button`)).find(
    (candidate) => normalizeText(candidate.textContent) === label,
  );
}

function getLink(container: HTMLElement, label: string) {
  const link = Array.from(container.querySelectorAll(`a`)).find(
    (candidate) => normalizeText(candidate.textContent) === label,
  );
  expect(link).toBeTruthy();
  return link as HTMLAnchorElement;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
    await Promise.resolve();
  });
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

describe(`ContractInlineActionsClient`, () => {
  beforeEach(() => {
    mockedCreatePaymentCheckoutSessionMutation.mockReset();
    mockedGenerateInvoiceMutation.mockReset();
    mockedSendPaymentRequestMutation.mockReset();
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = ``;
  });

  it(`shows the draft send path and calls the contract-aware send mutation`, async () => {
    mockedSendPaymentRequestMutation.mockResolvedValueOnce({
      ok: false,
      error: { code: `API_ERROR`, message: `Could not send the draft right now` },
    });

    const view = await renderComponent(
      <ContractInlineActionsClient
        paymentRequestId="payment-1"
        status="draft"
        role="requester"
        paymentRail={null}
        paymentDetailHref="/payments/payment-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        filesHref="/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        paymentFlowContext={paymentFlowContext}
      />,
    );

    expect(normalizeText(view.container.textContent)).toContain(
      `The current contract workflow is still a requester draft.`,
    );
    expect(getLink(view.container, `Open contract files`).getAttribute(`href`)).toBe(
      `/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1`,
    );

    await click(getButton(view.container, `Send active draft`));

    expect(mockedSendPaymentRequestMutation).toHaveBeenCalledWith(`payment-1`, paymentFlowContext);
    expect(normalizeText(view.container.textContent)).toContain(`Could not send the draft right now`);

    await view.unmount();
  });

  it(`shows payer checkout handoff only for non-bank pending payments and calls checkout with flow context`, async () => {
    mockedCreatePaymentCheckoutSessionMutation.mockResolvedValueOnce({
      ok: false,
      error: { code: `API_ERROR`, message: `Checkout is temporarily unavailable` },
    });

    const view = await renderComponent(
      <ContractInlineActionsClient
        paymentRequestId="payment-2"
        status="pending"
        role="payer"
        paymentRail="card"
        paymentDetailHref="/payments/payment-2?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        filesHref="/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        paymentFlowContext={paymentFlowContext}
      />,
    );

    expect(getButton(view.container, `Pay now with new card`)).toBeTruthy();
    expect(queryButton(view.container, `Generate invoice inline`)).toBeUndefined();
    expect(normalizeText(view.container.textContent)).not.toContain(`bank-transfer rail`);

    await click(getButton(view.container, `Pay now with new card`));

    expect(mockedCreatePaymentCheckoutSessionMutation).toHaveBeenCalledWith(`payment-2`, paymentFlowContext);
    expect(normalizeText(view.container.textContent)).toContain(`Checkout is temporarily unavailable`);

    await view.unmount();
  });

  it(`shows the requester invoice path and calls invoice generation with contract flow context`, async () => {
    mockedGenerateInvoiceMutation.mockResolvedValueOnce({
      ok: true,
      data: {
        invoiceNumber: `INV-1001`,
        resourceId: `resource-1`,
      },
      message: `Invoice INV-1001 is ready`,
    });

    const view = await renderComponent(
      <ContractInlineActionsClient
        paymentRequestId="payment-3"
        status="completed"
        role="requester"
        paymentRail={null}
        paymentDetailHref="/payments/payment-3?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        filesHref="/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        paymentFlowContext={paymentFlowContext}
      />,
    );

    expect(getButton(view.container, `Generate invoice inline`)).toBeTruthy();
    expect(queryButton(view.container, `Send latest draft`)).toBeUndefined();

    await click(getButton(view.container, `Generate invoice inline`));

    expect(mockedGenerateInvoiceMutation).toHaveBeenCalledWith(`payment-3`, paymentFlowContext);
    expect(normalizeText(view.container.textContent)).toContain(`Invoice INV-1001 is ready`);
    expect(queryButton(view.container, `Pay now with new card`)).toBeUndefined();

    await view.unmount();
  });

  it(`falls back to routed payment detail for pending bank-transfer states`, async () => {
    const view = await renderComponent(
      <ContractInlineActionsClient
        paymentRequestId="payment-4"
        status="pending"
        role="payer"
        paymentRail="BANK_TRANSFER"
        paymentDetailHref="/payments/payment-4?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        filesHref="/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1"
        paymentFlowContext={paymentFlowContext}
      />,
    );

    expect(queryButton(view.container, `Pay now with new card`)).toBeUndefined();
    expect(queryButton(view.container, `Generate invoice inline`)).toBeUndefined();
    expect(queryButton(view.container, `Send latest draft`)).toBeUndefined();
    expect(normalizeText(view.container.textContent)).toContain(`bank-transfer rail`);
    expect(getLink(view.container, `Open payment detail`).getAttribute(`href`)).toBe(
      `/payments/payment-4?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1`,
    );

    await view.unmount();
  });
});
