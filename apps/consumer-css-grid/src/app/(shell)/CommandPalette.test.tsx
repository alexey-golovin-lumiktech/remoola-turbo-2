/** @jest-environment jsdom */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockedPush = jest.fn();

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

jest.mock(`next/navigation`, () => ({
  useRouter: () => ({
    push: mockedPush,
  }),
}));

async function loadSubject() {
  return (await import(`./CommandPalette`)).CommandPalette;
}

let CommandPalette: Awaited<ReturnType<typeof loadSubject>>;

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

function getSearchInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="Search pages and actions"]`);
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}

async function dispatchKey(input: HTMLInputElement, key: string) {
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key, bubbles: true }));
  await Promise.resolve();
}

describe(`CommandPalette keyboard navigation`, () => {
  beforeAll(async () => {
    CommandPalette = await loadSubject();
  });

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, `scrollIntoView`, {
      configurable: true,
      value: jest.fn(),
    });
    mockedPush.mockReset();
    window.localStorage.clear();
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    document.body.innerHTML = ``;
  });

  it(`opens the currently highlighted result after ArrowDown then Enter in the same turn`, async () => {
    const view = await renderComponent(<CommandPalette open onClose={() => {}} />);
    const input = getSearchInput(view.container);

    await act(async () => {
      await dispatchKey(input, `ArrowDown`);
      await dispatchKey(input, `Enter`);
    });

    expect(mockedPush).toHaveBeenCalledWith(`/payments/start`);

    await view.unmount();
  });

  it(`opens the current result after ArrowDown, ArrowDown, ArrowUp, then Enter`, async () => {
    const view = await renderComponent(<CommandPalette open onClose={() => {}} />);
    const input = getSearchInput(view.container);

    await act(async () => {
      await dispatchKey(input, `ArrowDown`);
      await dispatchKey(input, `ArrowDown`);
      await dispatchKey(input, `ArrowUp`);
      await dispatchKey(input, `Enter`);
    });

    expect(mockedPush).toHaveBeenCalledWith(`/payments/start`);

    await view.unmount();
  });
});
