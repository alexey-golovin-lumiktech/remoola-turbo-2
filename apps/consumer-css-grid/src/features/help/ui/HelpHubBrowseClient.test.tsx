/**
 * @jest-environment jsdom
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

async function loadSubject() {
  return (await import(`./HelpHubBrowseClient`)).HelpHubBrowseClient;
}

let HelpHubBrowseClient: Awaited<ReturnType<typeof loadSubject>>;

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

function getInput(container: HTMLElement) {
  const input = container.querySelector(`input`);
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}

async function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, `value`)?.set;
  expect(valueSetter).toBeTruthy();

  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event(`change`, { bubbles: true }));
    input.dispatchEvent(new Event(`input`, { bubbles: true }));
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

describe(`HelpHubBrowseClient`, () => {
  beforeAll(async () => {
    HelpHubBrowseClient = await loadSubject();
  });

  beforeEach(() => {
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    document.body.innerHTML = ``;
  });

  it(`shows feature browse cards before any filters are applied`, async () => {
    const view = await renderComponent(<HelpHubBrowseClient />);

    expect(normalizeText(view.container.textContent)).toContain(`Browse by topic`);
    expect(normalizeText(view.container.textContent)).toContain(`Payments`);
    expect(normalizeText(view.container.textContent)).toContain(`How to create a payment request`);

    await view.unmount();
  });

  it(`filters guides by metadata search terms`, async () => {
    const view = await renderComponent(<HelpHubBrowseClient />);
    const input = getInput(view.container);

    await setInputValue(input, `upload`);

    expect(normalizeText(view.container.textContent)).toContain(`How to upload and attach documents`);
    expect(normalizeText(view.container.textContent)).not.toContain(`Payments overview`);

    await view.unmount();
  });

  it(`filters guides by feature chips`, async () => {
    const view = await renderComponent(<HelpHubBrowseClient />);

    await act(async () => {
      getButton(view.container, `Settings`).click();
    });

    expect(normalizeText(view.container.textContent)).toContain(`How to manage profile, preferences, and password`);
    expect(normalizeText(view.container.textContent)).not.toContain(`Payments overview`);

    await view.unmount();
  });

  it(`shows an empty state when no guides match`, async () => {
    const view = await renderComponent(<HelpHubBrowseClient />);
    const input = getInput(view.container);

    await setInputValue(input, `zzzz impossible query`);

    expect(normalizeText(view.container.textContent)).toContain(`No guides match this search`);

    await view.unmount();
  });
});
