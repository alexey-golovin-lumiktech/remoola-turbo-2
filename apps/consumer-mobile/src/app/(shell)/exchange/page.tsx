import { cookies } from 'next/headers';
import Link from 'next/link';

import type { IConsumerExchangeBalance } from '@remoola/api-types';

import { BalancesPanel } from '../../../features/exchange/ui/BalancesPanel';
import { ExchangeWidget } from '../../../features/exchange/ui/ExchangeWidget';
import { RatesPanel } from '../../../features/exchange/ui/RatesPanel';
import { getCurrencySymbol, normalizeCurrencies, type Currency } from '../../../lib/currency-utils';
import { getEnv } from '../../../lib/env.server';
import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClipboardListIcon } from '../../../shared/ui/icons/ClipboardListIcon';
import { ExchangeIcon } from '../../../shared/ui/icons/ExchangeIcon';
import { SettingsIcon } from '../../../shared/ui/icons/SettingsIcon';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  trend?: `up` | `down` | `stable`;
}

interface ExchangeData {
  currencies?: Currency[];
  balances?: IConsumerExchangeBalance[];
  rates?: ExchangeRate[];
}

function isBalanceRecord(x: unknown): x is Record<string, number> {
  if (typeof x !== `object` || x === null || Array.isArray(x)) return false;
  return Object.entries(x).every(([k, v]) => typeof k === `string` && typeof v === `number`);
}

function normalizeBalancesFromApi(data: unknown): IConsumerExchangeBalance[] {
  if (Array.isArray(data)) return data as IConsumerExchangeBalance[];
  if (isBalanceRecord(data)) {
    return Object.entries(data).map(([code, amountCents]) => ({
      currency: code,
      amountCents,
      symbol: getCurrencySymbol(code),
    }));
  }
  const items = (data as { items?: unknown[] })?.items;
  if (Array.isArray(items)) return items as IConsumerExchangeBalance[];
  return [];
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
    const balancesRaw = balancesRes.ok ? await balancesRes.json() : [];
    const rates = ratesRes.ok ? await ratesRes.json() : [];

    return {
      currencies: normalizeCurrencies(Array.isArray(currencies) ? currencies : (currencies?.items ?? [])),
      balances: normalizeBalancesFromApi(balancesRaw),
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

export default async function ExchangePage() {
  const data = await fetchExchangeData();

  return (
    <div
      className={`
      min-h-full
      bg-linear-to-br
      from-slate-50
      via-white
      to-slate-50
      dark:from-slate-950
      dark:via-slate-900
      dark:to-slate-950
    `}
    >
      <div
        className={`
        bg-white/90
        dark:bg-slate-900/90
        border-b
        border-slate-200/60
        dark:border-slate-700/60
        shadow-xs
        shadow-slate-200/50
        dark:shadow-slate-950/50
        px-4
        py-5
        sm:px-6
        sm:py-6
        lg:px-8
      `}
      >
        <div className={`mx-auto max-w-6xl`}>
          <div className={`flex items-center gap-3`}>
            <div
              className={`
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-linear-to-br
              from-primary-500
              to-primary-600
              shadow-lg
              shadow-primary-500/30
              ring-4
              ring-primary-50
              dark:ring-primary-950
              dark:shadow-primary-900/40
            `}
            >
              <ExchangeIcon className={`h-6 w-6 text-white`} strokeWidth={2} />
            </div>
            <div>
              <h1
                className={`
                text-3xl
                font-extrabold
                tracking-tight
                text-slate-900
                sm:text-4xl
                dark:text-white
              `}
              >
                Exchange
              </h1>
              <p
                className={`
                text-sm
                font-medium
                text-slate-600
                dark:text-slate-400
              `}
              >
                Convert currency and manage exchange rules
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`
        mx-auto
        max-w-6xl
        px-4
        pt-6
        pb-6
        sm:px-6
        sm:pt-8
        lg:px-8
        space-y-6
        animate-fadeIn
      `}
      >
        <ExchangeWidget availableCurrencies={data.currencies ?? []} balances={data.balances ?? []} />

        {data.balances && data.balances.length > 0 && <BalancesPanel balances={data.balances} />}

        {data.rates && data.rates.length > 0 && <RatesPanel rates={data.rates} />}

        <div className={`space-y-4`}>
          <h2
            className={`
            text-xl
            font-bold
            text-slate-900
            dark:text-white
            flex
            items-center
            gap-2
          `}
          >
            <SettingsIcon
              className={`
              h-5
              w-5
              text-primary-600
              dark:text-primary-400
            `}
              strokeWidth={2}
            />
            Manage
          </h2>

          <div className={`grid gap-3 sm:grid-cols-2`}>
            <Link
              href="/exchange/scheduled"
              className={`
                group
                overflow-hidden
                rounded-2xl
                border
                border-slate-700
                bg-slate-800/90
                shadow-lg
                transition-all
                duration-300
                hover:bg-slate-800
                hover:shadow-xl
                hover:scale-[1.02]
              `}
            >
              <div className={`p-4`}>
                <div className={`flex items-start gap-3`}>
                  <div
                    className={`
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-900/50
                    text-blue-400
                    transition-colors
                    group-hover:bg-blue-900
                    group-hover:text-blue-300
                  `}
                  >
                    <CalendarIcon className={`h-6 w-6`} strokeWidth={2} />
                  </div>
                  <div className={`flex-1 min-w-0`}>
                    <h3
                      className={`
                      text-base
                      font-bold
                      text-slate-100
                      group-hover:text-white
                      transition-colors
                    `}
                    >
                      Scheduled conversions
                    </h3>
                    <p className={`mt-1 text-sm text-slate-400`}>View and manage scheduled exchanges</p>
                  </div>
                  <ChevronRightIcon
                    className={`
                      h-5
                      w-5
                      shrink-0
                      text-slate-500
                      transition-transform
                      group-hover:translate-x-1
                      group-hover:text-slate-400
                    `}
                  />
                </div>
              </div>
            </Link>

            <Link
              href="/exchange/rules"
              className={`
                group
                overflow-hidden
                rounded-2xl
                border
                border-slate-700
                bg-slate-800/90
                shadow-lg
                transition-all
                duration-300
                hover:bg-slate-800
                hover:shadow-xl
                hover:scale-[1.02]
              `}
            >
              <div className={`p-4`}>
                <div className={`flex items-start gap-3`}>
                  <div
                    className={`
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-purple-900/50
                    text-purple-400
                    transition-colors
                    group-hover:bg-purple-900
                    group-hover:text-purple-300
                  `}
                  >
                    <ClipboardListIcon className={`h-6 w-6`} strokeWidth={2} />
                  </div>
                  <div className={`flex-1 min-w-0`}>
                    <h3
                      className={`
                      text-base
                      font-bold
                      text-slate-100
                      group-hover:text-white
                      transition-colors
                    `}
                    >
                      Exchange rules
                    </h3>
                    <p className={`mt-1 text-sm text-slate-400`}>Set up automatic exchange rules</p>
                  </div>
                  <ChevronRightIcon
                    className={`
                      h-5
                      w-5
                      shrink-0
                      text-slate-500
                      transition-transform
                      group-hover:translate-x-1
                      group-hover:text-slate-400
                    `}
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
