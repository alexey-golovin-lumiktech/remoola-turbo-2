import Link from 'next/link';

import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../../features/help/ui';
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
  const exchangeRulesHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.EXCHANGE_RULES,
    preferredSlugs: [
      HELP_GUIDE_SLUG.EXCHANGE_CONVERT_AND_AUTOMATE,
      HELP_GUIDE_SLUG.EXCHANGE_OVERVIEW,
      HELP_GUIDE_SLUG.EXCHANGE_COMMON_ISSUES,
    ],
    limit: 3,
  });

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
      <HelpContextualGuides
        guides={exchangeRulesHelpGuides}
        compact
        title="Understand rule thresholds before you automate conversions"
        description="These guides explain how rule targets, execution cadence, and exchange recovery differ from one-off conversions on the main Exchange page."
        className="mb-5"
      />
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
