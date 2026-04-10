/**
 * @jest-environment jsdom
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockedPush = jest.fn();

let mockPathname = `/contracts`;
let mockSearchParams = new URLSearchParams();

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  useRouter: () => ({
    push: mockedPush,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

jest.mock(`../../../shared/ui/shell-primitives`, () => ({
  ActionMini: ({ label }: { label: string }) => React.createElement(`div`, null, label),
  ChecklistItem: ({ children }: { children: React.ReactNode }) => React.createElement(`div`, null, children),
  Panel: ({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) =>
    React.createElement(
      `section`,
      null,
      React.createElement(`h2`, null, title),
      aside ? React.createElement(`div`, null, aside) : null,
      children,
    ),
  StatusPill: ({ status }: { status: string }) => React.createElement(`span`, null, status),
}));

async function loadSubject() {
  return (await import(`./ContractsClient`)).ContractsClient;
}

let ContractsClient: Awaited<ReturnType<typeof loadSubject>>;

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

function getLink(container: HTMLElement, label: string) {
  const link = Array.from(container.querySelectorAll(`a`)).find(
    (candidate) => normalizeText(candidate.textContent) === label,
  );
  expect(link).toBeTruthy();
  return link as HTMLAnchorElement;
}

function getSearchInput(container: HTMLElement) {
  const input = container.querySelector(`input[aria-label="Search contracts by contact name or email"]`);
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
    await Promise.resolve();
  });
}

async function changeInput(element: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, `value`)?.set;
    valueSetter?.call(element, value);
    element.dispatchEvent(new Event(`input`, { bubbles: true }));
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

const contracts = [
  {
    id: `contract-1`,
    name: `Vendor LLC`,
    email: `vendor@example.com`,
    lastRequestId: `payment-1`,
    lastStatus: `waiting`,
    lastActivity: `2026-04-01T09:15:00.000Z`,
    docs: 2,
    paymentsCount: 3,
    completedPaymentsCount: 1,
  },
];

describe(`ContractsClient`, () => {
  beforeAll(async () => {
    ContractsClient = await loadSubject();
  });

  beforeEach(() => {
    mockedPush.mockReset();
    mockPathname = `/contracts`;
    mockSearchParams = new URLSearchParams(`page=3&pageSize=10&status=waiting`);
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    document.body.innerHTML = ``;
  });

  it(`preserves list context in contract detail and row action hrefs`, async () => {
    const view = await renderComponent(
      <ContractsClient contracts={contracts} total={1} page={3} pageSize={10} initialStatus="waiting" />,
    );

    expect(getLink(view.container, `Vendor LLC`).getAttribute(`href`)).toBe(
      `/contracts/contract-1?returnTo=%2Fcontracts%3Fpage%3D3%26pageSize%3D10%26status%3Dwaiting`,
    );
    expect(getLink(view.container, `Open latest payment`).getAttribute(`href`)).toBe(
      `/payments/payment-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fpage%3D3%26pageSize%3D10%26status%3Dwaiting`,
    );
    expect(getLink(view.container, `Open contract files`).getAttribute(`href`)).toBe(
      `/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%252Fcontracts%253Fpage%253D3%2526pageSize%253D10%2526status%253Dwaiting`,
    );
    expect(getLink(view.container, `Edit contact`).getAttribute(`href`)).toBe(
      `/contacts?edit=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%252Fcontracts%253Fpage%253D3%2526pageSize%253D10%2526status%253Dwaiting`,
    );

    await view.unmount();
  });

  it(`submits backend search through the URL and resets pagination to the first page`, async () => {
    const view = await renderComponent(
      <ContractsClient contracts={contracts} total={1} page={3} pageSize={10} initialStatus="waiting" />,
    );

    await changeInput(getSearchInput(view.container), `Vendor Two`);
    await click(getButton(view.container, `Search`));

    expect(mockedPush).toHaveBeenCalledWith(`/contracts?page=1&pageSize=10&status=waiting&query=Vendor+Two`);

    await view.unmount();
  });

  it(`updates filters and page navigation through router pushes`, async () => {
    mockSearchParams = new URLSearchParams(`page=2&pageSize=10&status=waiting`);

    const view = await renderComponent(
      <ContractsClient contracts={contracts} total={30} page={2} pageSize={10} initialStatus="waiting" />,
    );

    await click(getButton(view.container, `Draft`));
    expect(mockedPush).toHaveBeenCalledWith(`/contracts?page=1&pageSize=10&status=draft`);

    mockedPush.mockReset();

    await click(getButton(view.container, `Next`));
    expect(mockedPush).toHaveBeenCalledWith(`/contracts?page=3&pageSize=10&status=waiting`);

    await view.unmount();
  });
});
