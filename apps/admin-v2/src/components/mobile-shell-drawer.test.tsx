/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import Link from 'next/link';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import type * as MobileShellDrawerModule from './mobile-shell-drawer';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

const { MobileShellDrawer } = jest.requireActual(`./mobile-shell-drawer`) as typeof MobileShellDrawerModule;

describe(`admin-v2 mobile shell drawer`, () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement(`div`);
    document.body.appendChild(container);
    root = createRoot(container);
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = ``;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  async function renderSubject(): Promise<void> {
    await act(async () => {
      root.render(
        <MobileShellDrawer>
          <nav>
            <Link href="#overview">Overview</Link>
            <Link href="#documents">Documents</Link>
          </nav>
        </MobileShellDrawer>,
      );
    });
  }

  it(`moves focus into the drawer on open and restores it to the trigger on escape`, async () => {
    await renderSubject();

    const trigger = container.querySelector(`button[aria-label="Open navigation"]`) as HTMLButtonElement;
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger.focus();
      trigger.click();
    });

    const panel = container.querySelector(`#mobile-shell-drawer-sheet`) as HTMLDivElement;
    const closeButton = container.querySelector(`button[aria-label="Close navigation"]`) as HTMLButtonElement;

    expect(panel.getAttribute(`aria-hidden`)).toBe(`false`);
    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }));
    });

    expect(panel.getAttribute(`aria-hidden`)).toBe(`true`);
    expect(document.activeElement).toBe(trigger);
  });

  it(`traps focus within the drawer and closes when a link is clicked`, async () => {
    await renderSubject();

    const trigger = container.querySelector(`button[aria-label="Open navigation"]`) as HTMLButtonElement;

    await act(async () => {
      trigger.click();
    });

    const closeButton = container.querySelector(`button[aria-label="Close navigation"]`) as HTMLButtonElement;
    const links = Array.from(container.querySelectorAll(`#mobile-shell-drawer-sheet a`)) as HTMLAnchorElement[];
    const lastLink = links[links.length - 1];
    const panel = container.querySelector(`#mobile-shell-drawer-sheet`) as HTMLDivElement;
    expect(lastLink).toBeDefined();
    if (!lastLink) {
      throw new Error(`Expected the drawer to render at least one navigation link.`);
    }

    await act(async () => {
      closeButton.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Tab`, shiftKey: true, bubbles: true }));
    });

    expect(document.activeElement).toBe(lastLink);

    await act(async () => {
      lastLink.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Tab`, bubbles: true }));
    });

    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      lastLink.click();
    });

    expect(panel.getAttribute(`aria-hidden`)).toBe(`true`);
  });
});
