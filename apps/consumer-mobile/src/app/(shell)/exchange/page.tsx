import { cookies } from 'next/headers';
import Link from 'next/link';

import { BalancesPanel } from '../../../features/exchange/ui/BalancesPanel';
import { ExchangeWidget } from '../../../features/exchange/ui/ExchangeWidget';
import { RatesPanel } from '../../../features/exchange/ui/RatesPanel';
import { normalizeCurrencies, type Currency } from '../../../lib/currency-utils';
import { getEnv } from '../../../lib/env.server';

interface Balance {
  currency: string;
  amountCents: number;
  symbol: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  trend?: `up` | `down` | `stable`;
}

interface ExchangeData {
  currencies?: Currency[];
  balances?: Balance[];
  rates?: ExchangeRate[];
}

async function fetchExchangeData(): Promise<ExchangeData> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return { currencies: [], balances: [], rates: [] };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  try {
    const [currenciesRes, balancesRes, ratesRes] = await Promise.all([
      fetch(`${baseUrl}/consumer/exchange/currencies`, {
        headers: { Cookie: cookie },
        cache: `no-store`,
      }),
      fetch(`${baseUrl}/consumer/payments/balance`, {
        headers: { Cookie: cookie },
        cache: `no-store`,
      }),
      fetch(`${baseUrl}/consumer/exchange/rates`, {
        headers: { Cookie: cookie },
        cache: `no-store`,
      }),
    ]);

    const currencies = currenciesRes.ok ? await currenciesRes.json() : [];
    const balances = balancesRes.ok ? await balancesRes.json() : [];
    const rates = ratesRes.ok ? await ratesRes.json() : [];

    return {
      currencies: normalizeCurrencies(Array.isArray(currencies) ? currencies : (currencies?.items ?? [])),
      balances: Array.isArray(balances) ? balances : (balances?.items ?? []),
      rates: Array.isArray(rates) ? rates : (rates?.items ?? []),
    };
  } catch {
    return {
      currencies: normalizeCurrencies([]),
      balances: [],
      rates: [],
    };
  }
}

const linkClass = `
flex
min-h-[44px]
items-center
justify-between
rounded-lg
border
border-slate-200
bg-white
p-4
font-medium
text-slate-900
transition-colors
hover:bg-slate-50
focus:outline-none
focus:ring-2
focus:ring-primary-500
dark:border-slate-700
dark:bg-slate-800
dark:text-white
dark:hover:bg-slate-700/50
`;

export default async function ExchangePage() {
  const data = await fetchExchangeData();

  return (
    <div
      className="
        mx-auto
        max-w-2xl
        space-y-6
        p-4
        pb-24
      "
    >
      <div>
        <h1
          className="
            text-2xl
            font-bold
            text-slate-900
            dark:text-white
          "
        >
          Exchange
        </h1>
        <p
          className="
            mt-1
            text-sm
            text-slate-600
            dark:text-slate-400
          "
        >
          Convert currency and manage exchange rules
        </p>
      </div>

      <ExchangeWidget availableCurrencies={data.currencies ?? []} balances={data.balances ?? []} />

      {data.balances && data.balances.length > 0 && <BalancesPanel balances={data.balances} />}

      {data.rates && data.rates.length > 0 && <RatesPanel rates={data.rates} />}

      <div
        className="
          space-y-3
        "
      >
        <h2
          className="
            text-lg
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          Manage
        </h2>

        <Link href="/exchange/scheduled" className={linkClass}>
          <div>
            <div
              className="
                font-semibold
              "
            >
              Scheduled conversions
            </div>
            <div
              className="
                text-xs
                text-slate-500
                dark:text-slate-400
              "
            >
              View and manage scheduled exchanges
            </div>
          </div>
          <svg
            className="
              h-5
              w-5
              text-slate-400
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link href="/exchange/rules" className={linkClass}>
          <div>
            <div
              className="
                font-semibold
              "
            >
              Exchange rules
            </div>
            <div
              className="
                text-xs
                text-slate-500
                dark:text-slate-400
              "
            >
              Set up automatic exchange rules
            </div>
          </div>
          <svg
            className="
              h-5
              w-5
              text-slate-400
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
