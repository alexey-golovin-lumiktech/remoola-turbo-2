/**
 * Static class-contract tests for shell routes.
 *
 * These tests don't render — they read the source files and assert each route
 * still uses the expected shared grid token. They protect against accidental
 * re-inlining of `xl:grid-cols-[...]` strings during future refactors.
 *
 * Keep this list narrow: only grids that appear in the handoff pack's
 * "representative responsive grids" list. Per-section contracts belong in
 * route-local tests once those tests exist.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

const APP_ROOT = join(__dirname, `..`, `..`, `app`, `(shell)`);

function readRoute(relativePath: string): string {
  return readFileSync(join(APP_ROOT, relativePath), `utf8`);
}

describe(`route grid contracts`, () => {
  it(`dashboard metrics section uses shellGridMetrics4`, () => {
    const src = readRoute(`dashboard/DashboardMetricsSection.tsx`);
    expect(src).toContain(`shellGridMetrics4`);
    expect(src).toMatch(/from\s+['"`][^'"`]*shell-grid-tokens['"`]/);
  });

  it(`dashboard main panels use shellMainAsideWideMain`, () => {
    const src = readRoute(`dashboard/DashboardMainPanelsSection.tsx`);
    expect(src).toContain(`shellMainAsideWideMain`);
  });

  it(`help hub uses shellMainAsideLeftSlight`, () => {
    const src = readRoute(`help/page.tsx`);
    expect(src).toContain(`shellMainAsideLeftSlight`);
  });

  it(`dashboard main panels do not re-inline mainAside ratios`, () => {
    const src = readRoute(`dashboard/DashboardMainPanelsSection.tsx`);
    expect(src).not.toContain(`xl:grid-cols-[1.5fr_1fr]`);
  });

  it(`help does not re-inline mainAside ratios`, () => {
    const src = readRoute(`help/page.tsx`);
    expect(src).not.toContain(`xl:grid-cols-[1.35fr_1fr]`);
  });

  it(`dashboard main panels use shellEmptyStateFaint (not the raw class)`, () => {
    const src = readRoute(`dashboard/DashboardMainPanelsSection.tsx`);
    expect(src).toContain(`shellEmptyStateFaint`);
    expect(src).not.toContain(`bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-faint)`);
  });

  it(`attach-to-payment modal empty states use shellEmptyStateCompact`, () => {
    const src = readRoute(`documents/AttachToPaymentModal.tsx`);
    expect(src).toContain(`shellEmptyStateCompact`);
    expect(src).not.toContain(`bg-(--app-surface-muted) px-4 py-8 text-center text-sm text-(--app-text-muted)`);
  });

  it(`contract detail composer uses shellMainAsideBalanced`, () => {
    const src = readRoute(`contracts/contract-detail-sections.tsx`);
    expect(src).toContain(`shellMainAsideBalanced`);
    expect(src).toMatch(/from\s+['"`][^'"`]*shell-layout-tokens['"`]/);
  });

  it(`contract detail metrics use shellGridDetail3`, () => {
    const src = readRoute(`contracts/ContractDetailMetricsSection.tsx`);
    expect(src).toContain(`shellGridDetail3`);
  });

  it(`contract timeline uses shellEmptyState`, () => {
    const src = readRoute(`contracts/ContractDetailTimelineSection.tsx`);
    expect(src).toContain(`shellEmptyState`);
  });

  it(`contract payment history uses shellEmptyState`, () => {
    const src = readRoute(`contracts/ContractDetailPaymentHistorySection.tsx`);
    expect(src).toContain(`shellEmptyState`);
  });

  it(`contract files section uses shellEmptyState`, () => {
    const src = readRoute(`contracts/ContractDetailFilesSection.tsx`);
    expect(src).toContain(`shellEmptyState`);
  });
});
