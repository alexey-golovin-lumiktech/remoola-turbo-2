import Link from 'next/link';
import { Suspense } from 'react';

import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../../features/help/ui';
import {
  getAvailableBalancesResult,
  getExchangeCurrenciesResult,
  getScheduledConversionsResult,
} from '../../../../lib/consumer-api.server';
import { cancelScheduledExchangeMutation, scheduleExchangeMutation } from '../../../../lib/mutations/exchange.server';
import { ExchangeIcon } from '../../../../shared/ui/icons/ExchangeIcon';
import { PageHeader, WorkspaceUnavailableBanner } from '../../../../shared/ui/shell-primitives';
import { type ExchangeSearchParams, parseExchangePaginationParams } from '../exchange-search-params';
import { pickTopCurrencies } from '../exchange-shared';
import { ExchangeScheduledSection } from '../ExchangeScheduledSection';

export default async function ExchangeScheduledPage({
  searchParams,
}: {
  searchParams?: Promise<ExchangeSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { scheduledPage, scheduledPageSize } = parseExchangePaginationParams(resolvedSearchParams);
  const exchangeScheduledHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.EXCHANGE_SCHEDULED,
    preferredSlugs: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ],
    limit: 3,
  });

  return (
    <div>
      <PageHeader
        title="Scheduled conversions"
        icon={<ExchangeIcon className="h-10 w-10 text-(--app-primary-contrast)" />}
      />
      <div className="mb-4">
        <Link href="/exchange" className="text-sm text-(--app-text-muted) hover:underline">
          ← Back to Exchange
        </Link>
      </div>
      <HelpContextualGuides
        guides={exchangeScheduledHelpGuides}
        compact
        title="Plan future conversions without losing exchange context"
        description="These guides stay focused on scheduled conversions: when to use future execution, how automation differs from immediate exchange, and where to look when a pending conversion does not behave as expected."
        className="mb-5"
      />
      <Suspense
        fallback={
          <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface) p-5 text-sm text-(--app-text-muted) shadow-(--app-shadow)">
            Loading scheduled conversions...
          </div>
        }
      >
        <ExchangeScheduledWorkspaceSection scheduledPage={scheduledPage} scheduledPageSize={scheduledPageSize} />
      </Suspense>
    </div>
  );
}

async function ExchangeScheduledWorkspaceSection({
  scheduledPage,
  scheduledPageSize,
}: {
  scheduledPage: number;
  scheduledPageSize: number;
}) {
  const [currenciesResult, balancesResult, scheduledResult] = await Promise.all([
    getExchangeCurrenciesResult({ redirectTo: `/exchange/scheduled` }),
    getAvailableBalancesResult({ redirectTo: `/exchange/scheduled` }),
    getScheduledConversionsResult(scheduledPage, scheduledPageSize, { redirectTo: `/exchange/scheduled` }),
  ]);
  const currencies = currenciesResult.data;
  const balances = balancesResult.data;
  const scheduledResponse = scheduledResult.data;
  const currencyCodes = (currencies ?? []).map((currency) => currency.code);
  const [fromCurrency = `USD`, toCurrency = `EUR`] = pickTopCurrencies(currencyCodes);

  return (
    <>
      {currenciesResult.unavailable || balancesResult.unavailable || scheduledResult.unavailable ? (
        <WorkspaceUnavailableBanner
          title="Scheduled conversions data is temporarily unavailable"
          text="The scheduled conversions workspace could not load live conversion, currency, or balance data from the backend right now."
        />
      ) : null}
      <ExchangeScheduledSection
        scheduled={scheduledResponse?.items ?? []}
        currencies={currencies ?? []}
        balances={balances}
        scheduledTotal={scheduledResponse?.total ?? 0}
        scheduledPage={scheduledPage}
        scheduledPageSize={scheduledPageSize}
        initialFromCurrency={fromCurrency}
        initialToCurrency={toCurrency}
        onSchedule={scheduleExchangeMutation}
        onCancel={cancelScheduledExchangeMutation}
      />
    </>
  );
}
