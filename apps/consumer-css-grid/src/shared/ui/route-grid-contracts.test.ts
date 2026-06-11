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

  it(`contact detail composer uses shellMainAsideBalanced`, () => {
    const src = readRoute(`contacts/ContactDetailView.tsx`);
    expect(src).toContain(`shellMainAsideBalanced`);
    expect(src).toMatch(/from\s+['"`][^'"`]*shell-layout-tokens['"`]/);
  });

  it(`contact detail metrics use shellGridDetail3`, () => {
    const src = readRoute(`contacts/ContactDetailMetricsSection.tsx`);
    expect(src).toContain(`shellGridDetail3`);
  });

  it(`contact payment records use shellEmptyState`, () => {
    const src = readRoute(`contacts/ContactDetailPaymentRecordsSection.tsx`);
    expect(src).toContain(`shellEmptyState`);
  });

  it(`contact files section uses shellEmptyState`, () => {
    const src = readRoute(`contacts/ContactDetailFilesSection.tsx`);
    expect(src).toContain(`shellEmptyState`);
  });

  it(`exchange schedule form section imports FieldHint`, () => {
    const src = readRoute(`exchange/ExchangeScheduleFormSection.tsx`);
    expect(src).toContain(`FieldHint`);
    expect(src).toMatch(/from\s+['"`]\.\/exchange-shared['"`]/);
  });

  it(`exchange scheduled list calls formatScheduleStatus + formatScheduledSecondaryStatus`, () => {
    const src = readRoute(`exchange/ExchangeScheduledList.tsx`);
    expect(src).toContain(`formatScheduleStatus`);
    expect(src).toContain(`formatScheduledSecondaryStatus`);
  });

  it(`exchange scheduled composer preserves the data-testid`, () => {
    const src = readRoute(`exchange/ExchangeScheduledSection.tsx`);
    expect(src).toContain(`exchange-scheduled-section`);
  });

  it(`exchange rule form section imports FieldHint`, () => {
    const src = readRoute(`exchange/ExchangeRuleFormSection.tsx`);
    expect(src).toContain(`FieldHint`);
    expect(src).toMatch(/from\s+['"`]\.\/exchange-shared['"`]/);
  });

  it(`exchange rules list pins per-row pendingActionId patterns`, () => {
    const src = readRoute(`exchange/ExchangeRulesList.tsx`);
    expect(src).toContain(`toggle-rule:`);
    expect(src).toContain(`delete-rule:`);
  });

  it(`exchange composers consume the shared ShellPagination`, () => {
    const scheduledSrc = readRoute(`exchange/ExchangeScheduledSection.tsx`);
    const rulesSrc = readRoute(`exchange/ExchangeRulesSection.tsx`);
    expect(scheduledSrc).toContain(`ShellPagination`);
    expect(rulesSrc).toContain(`ShellPagination`);
    expect(scheduledSrc).toMatch(/from\s+['"`][^'"`]*shared\/ui\/ShellPagination['"`]/);
    expect(rulesSrc).toMatch(/from\s+['"`][^'"`]*shared\/ui\/ShellPagination['"`]/);
  });

  it(`exchange rules composer preserves the data-testid`, () => {
    const src = readRoute(`exchange/ExchangeRulesSection.tsx`);
    expect(src).toContain(`exchange-rules-section`);
  });

  it(`contacts composer uses shellMainAsidePrimary and ShellPagination`, () => {
    const src = readRoute(`contacts/contacts-sections.tsx`);
    expect(src).toContain(`shellMainAsidePrimary`);
    expect(src).toContain(`ShellPagination`);
    expect(src).toMatch(/from\s+['"`][^'"`]*shared\/ui\/ShellPagination['"`]/);
  });

  it(`contacts composer no longer hand-rolls Previous/Next pagination`, () => {
    const src = readRoute(`contacts/contacts-sections.tsx`);
    expect(src).not.toMatch(/<button[^>]*>\s*Previous\s*<\/button>/);
    expect(src).not.toMatch(/<button[^>]*>\s*Next\s*<\/button>/);
  });

  it(`contacts list section uses shellContainerBase and shellEmptyState`, () => {
    const src = readRoute(`contacts/ContactsListSection.tsx`);
    expect(src).toContain(`shellContainerBase`);
    expect(src).toContain(`shellEmptyState`);
  });

  it(`contacts summary panel imports ActionMini`, () => {
    const src = readRoute(`contacts/ContactsSummaryPanel.tsx`);
    expect(src).toContain(`ActionMini`);
    expect(src).toMatch(/from\s+['"`][^'"`]*shared\/ui\/shell-actions['"`]/);
  });
});
