import Link from 'next/link';

import { getExchangeCurrencies, getExchangeRules } from '../../../../lib/consumer-api.server';
import {
  createExchangeRuleMutation,
  deleteExchangeRuleMutation,
  updateExchangeRuleMutation,
} from '../../../../lib/consumer-mutations.server';
import { ExchangeIcon } from '../../../../shared/ui/icons/ExchangeIcon';
import { PageHeader } from '../../../../shared/ui/shell-primitives';
import { type ExchangeSearchParams, parseExchangePaginationParams } from '../exchange-search-params';
import { pickTopCurrencies } from '../exchange-shared';
import { ExchangeRulesSection } from '../ExchangeRulesSection';

export default async function ExchangeRulesPage({ searchParams }: { searchParams?: Promise<ExchangeSearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { rulesPage, rulesPageSize } = parseExchangePaginationParams(resolvedSearchParams);
  const [currencies, rulesResponse] = await Promise.all([
    getExchangeCurrencies({ redirectTo: `/exchange/rules` }),
    getExchangeRules(rulesPage, rulesPageSize, { redirectTo: `/exchange/rules` }),
  ]);
  const currencyCodes = (currencies ?? []).map((currency) => currency.code);
  const [fromCurrency = `USD`, toCurrency = `EUR`] = pickTopCurrencies(currencyCodes);

  return (
    <div>
      <PageHeader
        title="Exchange rules"
        icon={<ExchangeIcon className="h-10 w-10 text-[var(--app-primary-contrast)]" />}
      />
      <div className="mb-4">
        <Link href="/exchange" className="text-sm text-[var(--app-text-muted)] hover:underline">
          ← Back to Exchange
        </Link>
      </div>
      <ExchangeRulesSection
        rules={rulesResponse?.items ?? []}
        currencies={currencies ?? []}
        rulesTotal={rulesResponse?.total ?? 0}
        rulesPage={rulesPage}
        rulesPageSize={rulesPageSize}
        initialFromCurrency={fromCurrency}
        initialToCurrency={toCurrency}
        onCreateRule={createExchangeRuleMutation}
        onUpdateRule={updateExchangeRuleMutation}
        onDeleteRule={deleteExchangeRuleMutation}
      />
    </div>
  );
}
