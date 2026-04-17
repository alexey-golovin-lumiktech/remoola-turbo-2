import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity } = jest.requireMock(`../../lib/admin-api.server`) as jest.Mocked<
  typeof AdminApi
>;

async function loadSubject() {
  return (await import(`./layout`)).default;
}

let ShellLayout: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 shell maturity framing`, () => {
  beforeAll(async () => {
    ShellLayout = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
  });

  it(`shows canonical shell tiers while keeping finance breadth and audit explorers nested`, async () => {
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-3 system maturity kickoff`,
      capabilities: [
        `overview.read`,
        `admins.read`,
        `audit.read`,
        `consumers.read`,
        `documents.read`,
        `exchange.read`,
        `ledger.read`,
        `payments.read`,
        `payment_methods.read`,
        `system.read`,
      ],
      workspaces: [
        `overview`,
        `admins`,
        `audit`,
        `consumers`,
        `documents`,
        `exchange`,
        `ledger`,
        `payments`,
        `payment_methods`,
        `system`,
      ],
    });

    const markup = renderToStaticMarkup(
      await ShellLayout({
        children: React.createElement(`section`, null, `Shell child content`),
      }),
    );

    expect(markup).toContain(`MVP-3 system maturity kickoff`);
    expect(markup).toContain(`Core shell`);
    expect(markup).toContain(`Top-level breadth`);
    expect(markup).toContain(`Finance breadth`);
    expect(markup).toContain(`Maturity`);
    expect(markup).toContain(`Audit explorers`);
    expect(markup).toContain(`Later breadth`);
    expect(markup).toContain(`href="/overview"`);
    expect(markup).toContain(`href="/consumers"`);
    expect(markup).toContain(`href="/payments"`);
    expect(markup).toContain(`href="/ledger"`);
    expect(markup).toContain(`href="/audit/auth"`);
    expect(markup).toContain(`>Audit<`);
    expect(markup).toContain(`href="/exchange"`);
    expect(markup).toContain(`href="/documents"`);
    expect(markup).toContain(`href="/admins"`);
    expect(markup).toContain(`href="/payouts"`);
    expect(markup).toContain(`href="/payment-methods"`);
    expect(markup).toContain(`href="/system"`);
    expect(markup).toContain(
      `Payouts and Payment Methods stay nested finance breadth, not permanent first-level peers.`,
    );
    expect(markup).toContain(
      `System stays a read-only maturity destination for cross-domain health signals, not a promoted core shell peer.`,
    );
    expect(markup).toContain(`Audit stays grouped as one shell bucket over the canonical explorer family.`);
    expect(markup).toContain(`href="/payouts"`);
    expect(markup).toContain(`>Auth<`);
    expect(markup).toContain(`>Admin Actions<`);
    expect(markup).toContain(`>Consumer Actions<`);
    expect(markup).not.toContain(`Audit · Auth`);
    expect(markup).not.toContain(`Audit · Admin Actions`);
    expect(markup).not.toContain(`Audit · Consumer Actions`);
    expect(markup).not.toContain(`MVP-2 aggregate breadth closed`);
    expect(markup).toContain(`Shell child content`);
  });

  it(`keeps Admins hidden while finance breadth remains nested when the identity lacks admins workspace`, async () => {
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-2`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3 system maturity kickoff`,
      capabilities: [
        `overview.read`,
        `audit.read`,
        `consumers.read`,
        `documents.read`,
        `exchange.read`,
        `ledger.read`,
        `payments.read`,
        `payment_methods.read`,
        `system.read`,
      ],
      workspaces: [
        `overview`,
        `audit`,
        `consumers`,
        `documents`,
        `exchange`,
        `ledger`,
        `payments`,
        `payment_methods`,
        `system`,
      ],
    });

    const markup = renderToStaticMarkup(
      await ShellLayout({
        children: React.createElement(`section`, null, `Shell child content`),
      }),
    );

    expect(markup).toContain(`Finance breadth`);
    expect(markup).toContain(`Maturity`);
    expect(markup).toContain(`Audit explorers`);
    expect(markup).toContain(`href="/audit/auth"`);
    expect(markup).toContain(`href="/payouts"`);
    expect(markup).toContain(`href="/payment-methods"`);
    expect(markup).toContain(`href="/system"`);
    expect(markup).not.toContain(`href="/admins"`);
  });
});
