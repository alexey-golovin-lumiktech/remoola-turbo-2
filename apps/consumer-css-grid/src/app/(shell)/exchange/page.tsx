import { type ExchangeSearchParams, parseExchangePaginationParams } from './exchange-search-params';
import { buildInitialRatePairs, pickTopCurrencies } from './exchange-shared';
import { ExchangeClient } from './ExchangeClient';
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
    <div>
      <PageHeader title="Exchange" icon={<ExchangeIcon className="h-10 w-10 text-[var(--app-primary-contrast)]" />} />
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
    </div>
  );
}
