/** @jest-environment jsdom */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockedPush = jest.fn();
const mockedRefresh = jest.fn();
const mockedCreateContactMutation = jest.fn();
const mockedUpdateContactMutation = jest.fn();
const mockedDeleteContactMutation = jest.fn();
let mockedSearchParamsValue = `page=3&pageSize=10`;

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
  usePathname: () => `/contacts`,
  useSearchParams: () => new URLSearchParams(mockedSearchParamsValue),
}));

jest.mock(`../../../lib/mutations/contacts.server`, () => ({
  createContactMutation: mockedCreateContactMutation,
  updateContactMutation: mockedUpdateContactMutation,
  deleteContactMutation: mockedDeleteContactMutation,
}));

jest.mock(`../../../shared/ui/shell-primitives`, () => ({
  ActionMini: ({ label }: { label: string }) => React.createElement(`div`, null, label),
}));

async function loadSubject() {
  return (await import(`./ContactsClient`)).ContactsClient;
}

let ContactsClient: Awaited<ReturnType<typeof loadSubject>>;

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

function getInput(container: HTMLElement, id: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}

async function changeInput(element: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, `value`)?.set;
    valueSetter?.call(element, value);
    element.dispatchEvent(new Event(`input`, { bubbles: true }));
    element.dispatchEvent(new Event(`change`, { bubbles: true }));
    await Promise.resolve();
  });
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
    await Promise.resolve();
  });
}

describe(`ContactsClient`, () => {
  beforeAll(async () => {
    ContactsClient = await loadSubject();
  });

  beforeEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedCreateContactMutation.mockReset();
    mockedUpdateContactMutation.mockReset();
    mockedDeleteContactMutation.mockReset();
    mockedSearchParamsValue = `page=3&pageSize=10`;
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    document.body.innerHTML = ``;
  });

  it(`pushes backend search through the URL and drops stale pagination`, async () => {
    const view = await renderComponent(<ContactsClient contacts={[]} totalContacts={0} page={3} pageSize={10} />);

    await changeInput(
      view.container.querySelector(`input[placeholder="Search by name or email"]`) as HTMLInputElement,
      `Vendor Two`,
    );
    await click(getButton(view.container, `Search`));

    expect(mockedPush).toHaveBeenCalledWith(`/contacts?query=Vendor+Two`);

    await view.unmount();
  });

  it(`redirects back to the safe return target after a successful create-mode save`, async () => {
    mockedCreateContactMutation.mockResolvedValue({ ok: true, message: `Contact created` });

    const view = await renderComponent(
      <ContactsClient
        contacts={[]}
        createMode
        initialEmail="vendor@example.com"
        returnTo="/payments/start?contractId=contract-1"
      />,
    );

    await changeInput(getInput(view.container, `contact-name`), `Vendor LLC`);
    await click(getButton(view.container, `Add contact`));

    expect(mockedCreateContactMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: `vendor@example.com`,
        name: `Vendor LLC`,
      }),
    );
    expect(mockedPush).toHaveBeenCalledWith(`/payments/start?contractId=contract-1`);
    expect(mockedRefresh).not.toHaveBeenCalled();

    await view.unmount();
  });
});
