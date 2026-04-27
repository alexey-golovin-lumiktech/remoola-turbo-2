/** @jest-environment jsdom */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { THEME } from '@remoola/api-types';

import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

import type * as ConsumerMutationsServer from '../../../lib/consumer-mutations.server';

const mockedPush = jest.fn();
const mockedRefresh = jest.fn();
const mockedSetTheme = jest.fn();
const mockedUpdateProfileMutation = jest.fn<typeof ConsumerMutationsServer.updateProfileMutation>();
const mockedUpdateSettingsMutation = jest.fn<typeof ConsumerMutationsServer.updateSettingsMutation>();
const mockedChangePasswordMutation = jest.fn<typeof ConsumerMutationsServer.changePasswordMutation>();

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
}));

jest.mock(`../../../shared/theme/ThemeProvider`, () => ({
  useTheme: () => ({
    theme: `SYSTEM`,
    setTheme: mockedSetTheme,
  }),
}));

jest.mock(`../../../lib/consumer-mutations.server`, () => ({
  updateProfileMutation: mockedUpdateProfileMutation,
  updateSettingsMutation: mockedUpdateSettingsMutation,
  changePasswordMutation: mockedChangePasswordMutation,
}));

jest.mock(`../../../lib/post-navigation`, () => ({
  submitPostNavigation: jest.fn(),
}));

jest.mock(`../../../lib/session-expired`, () => ({
  handleSessionExpiredError: () => false,
}));

jest.mock(`../dashboard/DashboardVerificationAction`, () => ({
  DashboardVerificationAction: () => React.createElement(`div`, null, `Verification action`),
}));

async function loadSubject() {
  return (await import(`./SettingsClient`)).SettingsClient;
}

let SettingsClient: Awaited<ReturnType<typeof loadSubject>>;

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ` `).trim() ?? ``;
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

function getButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll(`button`)).find(
    (candidate) => normalizeText(candidate.textContent) === label,
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function getButtonContaining(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll(`button`)).find((candidate) =>
    normalizeText(candidate.textContent).includes(text),
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
    await Promise.resolve();
  });
}

describe(`SettingsClient contextual help`, () => {
  beforeAll(async () => {
    SettingsClient = await loadSubject();
  });

  beforeEach(() => {
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedSetTheme.mockReset();
    mockedUpdateProfileMutation.mockReset();
    mockedUpdateSettingsMutation.mockReset();
    mockedChangePasswordMutation.mockReset();
    document.body.innerHTML = ``;
  });

  afterEach(() => {
    document.body.innerHTML = ``;
  });

  it(`renders contextual and inline help entrypoints for profile, verification, and password flows`, async () => {
    const view = await renderComponent(
      <SettingsClient
        profile={{
          id: `profile-1`,
          accountType: `individual`,
          hasPassword: true,
          personalDetails: {
            firstName: `Aleksey`,
            lastName: `Remoola`,
            phoneNumber: `+15551234567`,
          },
          organizationDetails: {
            name: `Remoola LLC`,
          },
          addressDetails: {
            country: `US`,
            city: `New York`,
            street: `5th Avenue`,
            postalCode: `10001`,
          },
          verification: {
            effectiveVerified: false,
            profileComplete: true,
            canStart: true,
            status: `not_started`,
            legalVerified: false,
            reviewStatus: `not_started`,
            stripeStatus: `not_started`,
            sessionId: null,
            lastErrorCode: null,
            lastErrorReason: null,
            startedAt: null,
            updatedAt: null,
            verifiedAt: null,
          },
        }}
        settings={{
          theme: THEME.SYSTEM,
          preferredCurrency: `USD`,
        }}
      />,
    );

    const text = normalizeText(view.container.textContent);

    expect(text).toContain(`Need help with profile, preferences, or security?`);
    expect(text).toContain(`Need help interpreting this verification state?`);
    expect(text).toContain(`Need help with password rules or what happens after save?`);
    expect(text).toContain(`Open help hub`);
    expect(view.container.innerHTML).toContain(`/help/${HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY}`);
    expect(view.container.innerHTML).toContain(`/help/${HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS}`);
    expect(view.container.innerHTML).toContain(`/help`);

    await view.unmount();
  });

  it(`shows a local loading state while preferences are saving`, async () => {
    let resolveMutation: ((value: Awaited<ReturnType<typeof mockedUpdateSettingsMutation>>) => void) | null = null;

    mockedUpdateSettingsMutation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const view = await renderComponent(
      <SettingsClient
        profile={{
          id: `profile-1`,
          accountType: `individual`,
          hasPassword: true,
          personalDetails: {
            firstName: `Aleksey`,
            lastName: `Remoola`,
            phoneNumber: `+15551234567`,
          },
          organizationDetails: {
            name: `Remoola LLC`,
          },
          addressDetails: {
            country: `US`,
            city: `New York`,
            street: `5th Avenue`,
            postalCode: `10001`,
          },
          verification: {
            effectiveVerified: false,
            profileComplete: true,
            canStart: true,
            status: `not_started`,
            legalVerified: false,
            reviewStatus: `not_started`,
            stripeStatus: `not_started`,
            sessionId: null,
            lastErrorCode: null,
            lastErrorReason: null,
            startedAt: null,
            updatedAt: null,
            verifiedAt: null,
          },
        }}
        settings={{
          theme: THEME.SYSTEM,
          preferredCurrency: `USD`,
        }}
      />,
    );

    await click(getButtonContaining(view.container, `Dark`));
    await click(getButton(view.container, `Save preferences`));

    const loadingButton = getButton(view.container, `Saving preferences...`);
    const currencySelect = view.container.querySelector(`#settings-preferred-currency`);

    expect(loadingButton.disabled).toBe(true);
    expect(currencySelect).toBeTruthy();
    expect((currencySelect as HTMLSelectElement).disabled).toBe(true);

    await act(async () => {
      resolveMutation?.({ ok: true, message: `Preferences updated` });
      await Promise.resolve();
    });

    expect(mockedRefresh).toHaveBeenCalled();

    await view.unmount();
  });
});
