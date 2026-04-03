import { cookies } from 'next/headers';

import { RulesView } from '../../../../features/exchange/ui/RulesView';
import { normalizeCurrencies, type Currency } from '../../../../lib/currency-utils';
import { getEnv } from '../../../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../../../lib/server-action-auth';

interface ExchangeRule {
  id: string;
  name: string;
  fromCurrency: string;
  toCurrency: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

async function fetchRulesData(): Promise<{ rules: ExchangeRule[]; currencies: Currency[] }> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  if (!baseUrl) {
    return { rules: [], currencies: [] };
  }

  try {
    const [rulesRes, currenciesRes] = await Promise.all([
      fetch(`${baseUrl}/consumer/exchange/rules`, {
        headers: buildServerReadAuthHeaders(cookie),
        cache: `no-store`,
      }),
      fetch(`${baseUrl}/consumer/exchange/currencies`, {
        headers: buildServerReadAuthHeaders(cookie),
        cache: `no-store`,
      }),
    ]);

    const rulesData = rulesRes.ok ? await rulesRes.json() : [];
    const currenciesData = currenciesRes.ok ? await currenciesRes.json() : [];

    return {
      rules: Array.isArray(rulesData) ? rulesData : (rulesData?.items ?? []),
      currencies: normalizeCurrencies(Array.isArray(currenciesData) ? currenciesData : (currenciesData?.items ?? [])),
    };
  } catch {
    return { rules: [], currencies: normalizeCurrencies([]) };
  }
}

export default async function ExchangeRulesPage() {
  const data = await fetchRulesData();

  return <RulesView rules={data.rules} currencies={data.currencies} />;
}
