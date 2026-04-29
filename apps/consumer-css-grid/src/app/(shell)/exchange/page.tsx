import { Suspense } from 'react';

import { type ExchangeSearchParams, parseExchangePaginationParams } from './exchange-search-params';
import { buildInitialRatePairs, pickTopCurrencies } from './exchange-shared';
import { ExchangeClient } from './ExchangeClient';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import {
  getAvailableBalances,
  getExchangeCurrencies,
  getExchangeRatesBatch,
  getExchangeRules,
  getScheduledConversions,
} from '../../../lib/consumer-api.server';
import { ExchangeIcon } from '../../../shared/ui/icons/ExchangeIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

export default async function ExchangePage({ searchParams }: { searchParams?: Promise<ExchangeSearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { rulesPage, rulesPageSize, scheduledPage, scheduledPageSize } =
    parseExchangePaginationParams(resolvedSearchParams);
  const exchangeHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.EXCHANGE,
    preferredSlugs: [
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ],
    limit: 3,
  });

  return (
    <div>
      <PageHeader title="Exchange" icon={<ExchangeIcon className="h-10 w-10 text-[var(--app-primary-contrast)]" />} />
      <HelpContextualGuides
        guides={exchangeHelpGuides}
        compact
        title="Choose between quote, convert now, and automation"
        description="These guides explain how the main Exchange page combines live-rate checks, immediate conversion, rules, and scheduled follow-up without leaving the broader currency workflow."
        className="mb-5"
      />
      <Suspense
        fallback={
          <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-muted)] shadow-[var(--app-shadow)]">
            Loading exchange workspace...
          </div>
        }
      >
        <ExchangeWorkspaceSection
          rulesPage={rulesPage}
          rulesPageSize={rulesPageSize}
          scheduledPage={scheduledPage}
          scheduledPageSize={scheduledPageSize}
        />
      </Suspense>
    </div>
  );
}

async function ExchangeWorkspaceSection({
  rulesPage,
  rulesPageSize,
  scheduledPage,
  scheduledPageSize,
}: {
  rulesPage: number;
  rulesPageSize: number;
  scheduledPage: number;
  scheduledPageSize: number;
}) {
  const [currencies, balances, rulesResponse, scheduledResponse] = await Promise.all([
    getExchangeCurrencies({ redirectTo: `/exchange` }),
    getAvailableBalances({ redirectTo: `/exchange` }),
    getExchangeRules(rulesPage, rulesPageSize, { redirectTo: `/exchange` }),
    getScheduledConversions(scheduledPage, scheduledPageSize, { redirectTo: `/exchange` }),
  ]);
  const currencyCodes = (currencies ?? []).map((currency) => currency.code);
  const [fromCurrency = `USD`, toCurrency = `EUR`, thirdCurrency] = pickTopCurrencies(currencyCodes);
  const initialRatePairs = buildInitialRatePairs(fromCurrency, toCurrency, thirdCurrency);
  const exchangeRates = await getExchangeRatesBatch(initialRatePairs, { redirectTo: `/exchange` });

  return (
    <ExchangeClient
      currencies={currencies ?? []}
      balances={balances}
      rules={rulesResponse?.items ?? []}
      rulesTotal={rulesResponse?.total ?? 0}
      rulesPage={rulesPage}
      rulesPageSize={rulesPageSize}
      scheduled={scheduledResponse?.items ?? []}
      scheduledTotal={scheduledResponse?.total ?? 0}
      scheduledPage={scheduledPage}
      scheduledPageSize={scheduledPageSize}
      exchangeRates={exchangeRates.items}
      exchangeRatesUnavailable={exchangeRates.unavailable}
      initialRatePairs={initialRatePairs}
      initialFromCurrency={fromCurrency}
      initialToCurrency={toCurrency}
    />
  );
}
