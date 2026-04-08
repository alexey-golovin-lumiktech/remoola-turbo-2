import Link from 'next/link';

import {
  getAvailableBalances,
  getExchangeCurrencies,
  getScheduledConversions,
} from '../../../../lib/consumer-api.server';
import { cancelScheduledExchangeMutation, scheduleExchangeMutation } from '../../../../lib/consumer-mutations.server';
import { ExchangeIcon } from '../../../../shared/ui/icons/ExchangeIcon';
import { PageHeader } from '../../../../shared/ui/shell-primitives';
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
  const [currencies, balances, scheduledResponse] = await Promise.all([
    getExchangeCurrencies({ redirectTo: `/exchange/scheduled` }),
    getAvailableBalances({ redirectTo: `/exchange/scheduled` }),
    getScheduledConversions(scheduledPage, scheduledPageSize, { redirectTo: `/exchange/scheduled` }),
  ]);
  const currencyCodes = (currencies ?? []).map((currency) => currency.code);
  const [fromCurrency = `USD`, toCurrency = `EUR`] = pickTopCurrencies(currencyCodes);

  return (
    <div>
      <PageHeader
        title="Scheduled conversions"
        icon={<ExchangeIcon className="h-10 w-10 text-[var(--app-primary-contrast)]" />}
      />
      <div className="mb-4">
        <Link href="/exchange" className="text-sm text-[var(--app-text-muted)] hover:underline">
          ← Back to Exchange
        </Link>
      </div>
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
    </div>
  );
}
